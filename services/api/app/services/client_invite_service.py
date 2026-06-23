"""Klient-Einladungen (Fachperson → Person).

Eine Fachperson erzeugt eine Einladung (Token für den Link + Kurz-Code). Nimmt
die Person sie an, schreibt accept_client_invite genau die bestehende
``professional_invites``-Verbindung (inviter = Person), sodass der vorhandene
Teilen-/Freigabe-Mechanismus (case_shares) unverändert greift. Die Einladung
selbst legt keinen Fall an und gibt nichts frei.

HTTP-frei: Ergebnisse werden als (status, payload)-Tupel zurückgegeben; der
Router bildet sie auf HTTP-Statuscodes ab.
"""
from __future__ import annotations

import secrets
from datetime import UTC, datetime

import asyncpg

from app.core.logging import get_logger

logger = get_logger(__name__)

# Kurz-Code-Alphabet ohne verwechselbare Zeichen (kein I/O/L/0/1).
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_CODE_LEN = 8


def _gen_token() -> str:
    return secrets.token_urlsafe(24)


def _gen_code() -> str:
    """8-stelliger Code, in der DB ohne Trennzeichen gespeichert (Anzeige mit Bindestrich)."""
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LEN))


def normalize_code(raw: str | None) -> str | None:
    """Vereinheitlicht eine manuelle Code-Eingabe: Großschreibung, nur A–Z/2–9."""
    if not raw:
        return None
    cleaned = "".join(ch for ch in raw.upper() if ch in _CODE_ALPHABET)
    return cleaned or None


async def create_client_invite(
    conn: asyncpg.Connection,
    professional_user_id,
    org_id,
    label: str | None,
) -> asyncpg.Record:
    """Legt eine neue Einladung an (eindeutiger Token + Code, mit Retry)."""
    label = (label or "").strip() or None
    for _ in range(5):
        try:
            return await conn.fetchrow(
                """
                INSERT INTO client_invites (token, code, professional_user_id, org_id, label)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
                """,
                _gen_token(), _gen_code(), professional_user_id, org_id, label,
            )
        except asyncpg.UniqueViolationError:
            continue  # extrem unwahrscheinliche Kollision → neuer Token/Code
    raise RuntimeError("Konnte keine eindeutige Einladung erzeugen.")


async def list_client_invites(
    conn: asyncpg.Connection,
    professional_user_id,
) -> list[asyncpg.Record]:
    return await conn.fetch(
        "SELECT * FROM client_invites WHERE professional_user_id = $1 "
        "AND status <> 'revoked' ORDER BY created_at DESC",
        professional_user_id,
    )


async def revoke_client_invite(
    conn: asyncpg.Connection,
    professional_user_id,
    invite_id,
) -> bool:
    """Zieht eine noch offene Einladung zurück. Bestehende Verbindungen bleiben unberührt."""
    result = await conn.execute(
        "UPDATE client_invites SET status = 'revoked' "
        "WHERE id = $1 AND professional_user_id = $2 AND status = 'pending'",
        invite_id, professional_user_id,
    )
    return result != "UPDATE 0"


async def get_public_invite(conn: asyncpg.Connection, token: str) -> dict | None:
    """Öffentliche Sicht für die Landingpage (per Token). None wenn unbekannt."""
    row = await conn.fetchrow(
        """
        SELECT ci.status, ci.expires_at,
               p.display_name, p.title,
               o.name AS org_name
        FROM client_invites ci
        LEFT JOIN professional_profiles p ON p.user_id = ci.professional_user_id
        LEFT JOIN organizations o ON o.id = ci.org_id
        WHERE ci.token = $1
        """,
        token,
    )
    if not row:
        return None
    expired = row["expires_at"] is not None and row["expires_at"] < datetime.now(UTC)
    valid = row["status"] == "pending" and not expired
    return {
        "valid": valid,
        "status": "expired" if expired else row["status"],
        "professional_display_name": row["display_name"],
        "professional_title": row["title"],
        "org_name": row["org_name"],
    }


async def accept_client_invite(
    conn: asyncpg.Connection,
    token: str | None,
    code: str | None,
    client_user_id,
    client_email: str | None,
) -> tuple[str, dict]:
    """Nimmt eine Einladung an und stellt die Verbindung her.

    Rückgabe (status, payload):
      ("not_found", {}) · ("revoked", {}) · ("expired", {}) ·
      ("used_by_other", {}) · ("self_invite", {}) ·
      ("ok", {professional_user_id, professional_display_name, already})
    """
    code_norm = normalize_code(code)
    invite = await conn.fetchrow(
        "SELECT * FROM client_invites WHERE token = $1 OR ($2::text IS NOT NULL AND code = $2)",
        token, code_norm,
    )
    if not invite:
        return ("not_found", {})

    pro_id = invite["professional_user_id"]

    if str(pro_id) == str(client_user_id):
        return ("self_invite", {})

    # Bereits angenommen?
    if invite["status"] == "accepted":
        if str(invite["accepted_user_id"]) == str(client_user_id):
            display = await _connect(conn, client_user_id, pro_id)
            return ("ok", {"professional_user_id": pro_id,
                           "professional_display_name": display, "already": True})
        return ("used_by_other", {})

    if invite["status"] == "revoked":
        return ("revoked", {})

    if invite["expires_at"] is not None and invite["expires_at"] < datetime.now(UTC):
        return ("expired", {})

    # Offen → atomar auf 'accepted' setzen (Race-sicher).
    claimed = await conn.execute(
        "UPDATE client_invites SET status = 'accepted', accepted_user_id = $2, accepted_at = NOW() "
        "WHERE id = $1 AND status = 'pending'",
        invite["id"], client_user_id,
    )
    if claimed == "UPDATE 0":
        # Race: zwischenzeitlich angenommen → prüfen von wem.
        fresh = await conn.fetchrow(
            "SELECT accepted_user_id FROM client_invites WHERE id = $1", invite["id"],
        )
        if fresh and str(fresh["accepted_user_id"]) == str(client_user_id):
            display = await _connect(conn, client_user_id, pro_id)
            return ("ok", {"professional_user_id": pro_id,
                           "professional_display_name": display, "already": True})
        return ("used_by_other", {})

    display = await _connect(conn, client_user_id, pro_id)
    logger.info("Klient-Einladung angenommen (pro=%s).", str(pro_id)[:8])
    return ("ok", {"professional_user_id": pro_id,
                   "professional_display_name": display, "already": False})


async def _connect(conn: asyncpg.Connection, client_user_id, pro_id) -> str | None:
    """Schreibt die professional_invites-Verbindung (inviter = Klient:in) – idempotent.

    Damit greift der bestehende Teilen-Mechanismus: create_share prüft genau diese
    Zeile (inviter_user_id = Klient:in, professional_user_id = Fachperson, accepted).
    """
    pro = await conn.fetchrow(
        "SELECT email, display_name FROM professional_profiles WHERE user_id = $1", pro_id,
    )
    # email ist Schlüssel des bestehenden UNIQUE (inviter_user_id, email); echte
    # E-Mail wenn vorhanden, sonst stabiler Fallback (eindeutig je Fachperson).
    raw_email = (pro["email"] if pro else None) or f"pro-{pro_id}@echob.local"
    pro_email = raw_email.strip().lower()
    await conn.execute(
        """
        INSERT INTO professional_invites
            (inviter_user_id, email, professional_user_id, status, accepted_at)
        VALUES ($1, $2, $3, 'accepted', NOW())
        ON CONFLICT (inviter_user_id, email) DO UPDATE SET
          professional_user_id = EXCLUDED.professional_user_id,
          status = 'accepted', accepted_at = NOW()
        """,
        client_user_id, pro_email, pro_id,
    )
    return pro["display_name"] if pro else None

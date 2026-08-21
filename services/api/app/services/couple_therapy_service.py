"""Paartherapie (peer-to-peer): Kopplung zweier Nutzer:innen — Sicherheits-Flaschenhals.

Sicherheits-Grundsatz: Eine Kopplung (``couple_link``) ist KEINE Freigabe. Sie gewährt der
anderen Person KEINEN Zugriff auf Fall, Szenen, Skalen, Berichte, Hypothesen oder das private
Echo. Sie ist ausschließlich der Türöffner zum gemeinsamen Paarraum. Jeder Paarraum-Endpunkt
geht durch ``require_couple_member`` — strukturell analog zu ``sharing_service``, aber bewusst
OHNE ``load_shared_bundle`` und OHNE ``build_case_context`` (kein Fall-Zugriff, kein Leak).

Der Kontext, den Echo im Paarraum bekommt, wird in den Folgephasen ausnahmslos vom Nutzer
EXPLIZIT zusammengestellt. Dieser Service kennt bewusst keinerlei Fallinhalte.

HTTP-frei: Ergebnisse werden als ``(status, payload)``-Tupel zurückgegeben; der Router bildet
sie auf HTTP-Statuscodes ab (Muster wie ``client_invite_service``).
"""
from __future__ import annotations

import secrets

import asyncpg
from fastapi import HTTPException

from app.core.logging import get_logger

logger = get_logger(__name__)

# Kopplungscode ohne verwechselbare Zeichen (kein I/O/L/0/1). Anzeige mit Bindestrich, DB ohne.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_CODE_LEN = 8


def _gen_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LEN))


def normalize_code(raw: str | None) -> str | None:
    """Vereinheitlicht eine manuelle Code-Eingabe: Großschreibung, nur A–Z/2–9."""
    if not raw:
        return None
    cleaned = "".join(ch for ch in raw.upper() if ch in _CODE_ALPHABET)
    return cleaned or None


async def create_link(conn, initiator_user_id, initiator_case_id=None) -> asyncpg.Record:
    """Legt einen offenen Paar-Link (Einladung) an — eindeutiger Kopplungscode, mit Retry.

    Der Anker-Fall (``initiator_case_id``) ist NUR Herkunft/Bezug und begründet keinen
    Datenzugriff der annehmenden Person.

    Existiert bereits eine offene Einladung dieser Person mit demselben Anker-Fall, wird
    diese zurückgegeben (kein Code-Wildwuchs, gleicher Code bleibt teilbar).
    """
    existing = await conn.fetchrow(
        "SELECT * FROM couple_links "
        "WHERE initiator_user_id = $1 AND status = 'pending' "
        "AND initiator_case_id IS NOT DISTINCT FROM $2 "
        "ORDER BY created_at DESC LIMIT 1",
        initiator_user_id, initiator_case_id,
    )
    if existing:
        return existing

    for _ in range(5):
        try:
            return await conn.fetchrow(
                """
                INSERT INTO couple_links (invite_code, initiator_user_id, initiator_case_id)
                VALUES ($1, $2, $3)
                RETURNING *
                """,
                _gen_code(), initiator_user_id, initiator_case_id,
            )
        except asyncpg.UniqueViolationError:
            continue  # extrem unwahrscheinliche Kollision → neuer Code
    raise RuntimeError("Konnte keinen eindeutigen Kopplungscode erzeugen.")


async def get_public_link(conn, code: str | None) -> dict | None:
    """Öffentliche Minimal-Sicht einer Einladung (per Code) für die Beitritts-Seite.

    Gibt bewusst KEINE Namen/Inhalte preis — nur, ob der Code einlösbar ist.
    """
    code_norm = normalize_code(code)
    if not code_norm:
        return None
    row = await conn.fetchrow(
        "SELECT status FROM couple_links WHERE invite_code = $1", code_norm,
    )
    if not row:
        return None
    return {"valid": row["status"] == "pending", "status": row["status"]}


async def accept_link(conn, code, partner_user_id, partner_case_id=None) -> tuple[str, dict]:
    """Nimmt eine Kopplung per Code an (Race-sicher, idempotent).

    Rückgabe ``(status, payload)``:
      ("not_found", {}) · ("ended", {}) · ("self_link", {}) ·
      ("used_by_other", {}) · ("ok", {couple_id, already})
    """
    code_norm = normalize_code(code)
    if not code_norm:
        return ("not_found", {})
    link = await conn.fetchrow(
        "SELECT * FROM couple_links WHERE invite_code = $1", code_norm,
    )
    if not link:
        return ("not_found", {})

    if str(link["initiator_user_id"]) == str(partner_user_id):
        return ("self_link", {})

    if link["status"] == "active":
        if str(link["partner_user_id"]) == str(partner_user_id):
            return ("ok", {"couple_id": link["id"], "already": True})
        return ("used_by_other", {})

    if link["status"] == "ended":
        return ("ended", {})

    # Offen → atomar auf 'active' setzen (Race-sicher gegen Doppelannahme).
    claimed = await conn.execute(
        "UPDATE couple_links SET partner_user_id = $2, partner_case_id = $3, "
        "status = 'active', accepted_at = NOW() "
        "WHERE id = $1 AND status = 'pending'",
        link["id"], partner_user_id, partner_case_id,
    )
    if claimed == "UPDATE 0":
        # Race: zwischenzeitlich angenommen → prüfen von wem.
        fresh = await conn.fetchrow(
            "SELECT partner_user_id FROM couple_links WHERE id = $1", link["id"],
        )
        if fresh and str(fresh["partner_user_id"]) == str(partner_user_id):
            return ("ok", {"couple_id": link["id"], "already": True})
        return ("used_by_other", {})

    logger.info("Paar-Kopplung angenommen (link=%s).", str(link["id"])[:8])
    return ("ok", {"couple_id": link["id"], "already": False})


async def require_couple_member(conn, couple_id, user_id) -> dict:
    """DER Flaschenhals. Liefert den aktiven Paarraum, wenn ``user_id`` Mitglied ist — sonst 404.

    404 (nicht 403) verhindert Existenz-Leak und den direkten Abruf fremder Paarräume per ID.
    Gibt NIE Falldaten heraus — nur die Link-Zeile selbst.
    """
    row = await conn.fetchrow(
        "SELECT * FROM couple_links "
        "WHERE id = $1 AND status = 'active' "
        "AND (initiator_user_id = $2 OR partner_user_id = $2)",
        couple_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Paarraum nicht gefunden.")
    return dict(row)


def partner_of(link: dict, user_id) -> str | None:
    """Die jeweils andere Person im Paarraum (oder None, solange die Einladung offen ist)."""
    if str(link["initiator_user_id"]) == str(user_id):
        return link["partner_user_id"]
    return link["initiator_user_id"]


async def load_partner_profile(conn, link: dict, user_id) -> dict:
    """Anzeigename und Avatar der anderen Person — mehr geht bewusst nicht über.

    Beide haben der Kopplung zugestimmt; für Anrede und Wiedererkennung im Raum reicht
    das. Keine E-Mail, kein Profil, keine Fall-Daten.
    """
    partner_id = partner_of(link, user_id)
    if not partner_id:
        return {"display_name": None, "avatar": None}
    row = await conn.fetchrow(
        "SELECT display_name, avatar FROM user_profiles WHERE user_id = $1", partner_id,
    )
    return {
        "display_name": row["display_name"] if row else None,
        "avatar": row["avatar"] if row else None,
    }


async def load_partner_display_name(conn, link: dict, user_id) -> str | None:
    """Selbstgewählter Anzeigename der anderen Person — bewusst das EINZIGE, was übergeht.

    Keine E-Mail, keine Fall-Daten, kein Profil. Beide haben der Kopplung zugestimmt;
    für die Anrede im Paarraum reicht der Anzeigename (kann auch ein Pseudonym sein).
    """
    partner_id = partner_of(link, user_id)
    if not partner_id:
        return None
    return await conn.fetchval(
        "SELECT display_name FROM user_profiles WHERE user_id = $1", partner_id,
    )


async def list_for_user(conn, user_id) -> list[asyncpg.Record]:
    """Alle nicht beendeten Paarräume/Einladungen, in denen ``user_id`` vorkommt."""
    return await conn.fetch(
        "SELECT * FROM couple_links "
        "WHERE status <> 'ended' AND (initiator_user_id = $1 OR partner_user_id = $1) "
        "ORDER BY created_at DESC",
        user_id,
    )


async def end_link(conn, couple_id, user_id) -> bool:
    """Beendet einen Paarraum oder zieht die eigene offene Einladung zurück (nur ein Mitglied)."""
    result = await conn.execute(
        "UPDATE couple_links SET status = 'ended', ended_at = NOW(), ended_by = $2 "
        "WHERE id = $1 AND status <> 'ended' "
        "AND (initiator_user_id = $2 OR partner_user_id = $2)",
        couple_id, user_id,
    )
    if result != "UPDATE 0":
        # Mit dem Raum endet die Freigabe an Fachpersonen. Der Lesepfad prueft den
        # Raum-Status ohnehin mit (require_released) - das hier ist der zweite Riegel und
        # sorgt dafuer, dass die Listen die Wahrheit zeigen statt einer toten Freigabe.
        await conn.execute(
            "UPDATE couple_professional_shares SET status = 'revoked', "
            "revoked_by = $2, revoked_at = NOW(), updated_at = NOW() "
            "WHERE couple_id = $1 AND status IN ('pending', 'active')",
            couple_id, user_id,
        )
    return result != "UPDATE 0"

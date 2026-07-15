"""Studierenden-Einladungen (Ausbildungsinstitut → Student:in).

Das Institut erzeugt eine Einladung (Token für den Link + Kurz-Code). Nimmt die/der
Studierende sie an, wird eine ``students``-Zeile angelegt (Verknüpfung ans Institut).
Kontingent (student_quota) wird beim Erstellen der Einladung geprüft.
"""
from __future__ import annotations

import secrets
from datetime import UTC, datetime

import asyncpg

# Kurz-Code-Alphabet ohne verwechselbare Zeichen (kein I/O/L/0/1) — wie client_invites.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_CODE_LEN = 8


def _gen_token() -> str:
    return secrets.token_urlsafe(24)


def _gen_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LEN))


def normalize_code(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = "".join(ch for ch in raw.upper() if ch in _CODE_ALPHABET)
    return cleaned or None


async def seat_count(conn: asyncpg.Connection, institute_id) -> int:
    """Belegte + reservierte Plätze: aktive Studierende + offene Einladungen."""
    students = await conn.fetchval(
        "SELECT count(*) FROM students WHERE institute_id = $1 AND status = 'active'", institute_id)
    pending = await conn.fetchval(
        "SELECT count(*) FROM student_invites WHERE institute_id = $1 AND status = 'pending'", institute_id)
    return (students or 0) + (pending or 0)


async def create_invite(conn: asyncpg.Connection, institute_id, label: str | None) -> asyncpg.Record:
    label = (label or "").strip() or None
    for _ in range(5):
        try:
            return await conn.fetchrow(
                "INSERT INTO student_invites (token, code, institute_id, label) "
                "VALUES ($1, $2, $3, $4) RETURNING *",
                _gen_token(), _gen_code(), institute_id, label,
            )
        except asyncpg.UniqueViolationError:
            continue
    raise RuntimeError("Konnte keine eindeutige Einladung erzeugen.")


async def list_invites(conn: asyncpg.Connection, institute_id) -> list[asyncpg.Record]:
    return await conn.fetch(
        "SELECT * FROM student_invites WHERE institute_id = $1 AND status = 'pending' "
        "ORDER BY created_at DESC",
        institute_id,
    )


async def revoke_invite(conn: asyncpg.Connection, institute_id, invite_id) -> bool:
    result = await conn.execute(
        "UPDATE student_invites SET status = 'revoked' "
        "WHERE id = $1 AND institute_id = $2 AND status = 'pending'",
        invite_id, institute_id,
    )
    return result != "UPDATE 0"


async def accept_invite(
    conn: asyncpg.Connection, token: str | None, code: str | None, user_id, display_name: str | None,
) -> tuple[str, dict]:
    """Nimmt eine Einladung an → legt (idempotent) eine students-Zeile an.

    Rückgabe (status, payload): not_found · revoked · expired · used_by_other · ok.
    """
    # Bereits Student? → idempotent ok.
    existing = await conn.fetchrow("SELECT id FROM students WHERE user_id = $1", user_id)
    if existing:
        return ("ok", {"already": True})

    code_norm = normalize_code(code)
    invite = await conn.fetchrow(
        "SELECT * FROM student_invites WHERE token = $1 OR ($2::text IS NOT NULL AND code = $2)",
        token, code_norm,
    )
    if not invite:
        return ("not_found", {})
    if invite["status"] == "accepted":
        return ("used_by_other", {})
    if invite["status"] == "revoked":
        return ("revoked", {})
    if invite["expires_at"] is not None and invite["expires_at"] < datetime.now(UTC):
        return ("expired", {})

    claimed = await conn.execute(
        "UPDATE student_invites SET status = 'accepted', accepted_user_id = $2, accepted_at = NOW() "
        "WHERE id = $1 AND status = 'pending'",
        invite["id"], user_id,
    )
    if claimed == "UPDATE 0":
        return ("used_by_other", {})

    name = (display_name or "").strip() or invite["label"] or "Studierende:r"
    await conn.execute(
        "INSERT INTO students (user_id, institute_id, display_name) VALUES ($1, $2, $3) "
        "ON CONFLICT (user_id) DO NOTHING",
        user_id, invite["institute_id"], name[:120],
    )
    return ("ok", {"already": False})

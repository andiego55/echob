"""Account-Service – DSGVO-Betroffenenrechte.

Datenexport (Art. 15 Auskunft / Art. 20 Übertragbarkeit) und vollständige
Konto-/Datenlöschung (Art. 17).

Die Tabellenlisten sind bewusst **explizit**, damit nachvollziehbar bleibt, welche
Daten exportiert bzw. gelöscht werden. Bei neuen nutzerbezogenen Tabellen hier ergänzen.
Tabellen-/WHERE-Fragmente stammen ausschließlich aus den Konstanten unten – niemals
aus Nutzereingaben (kein SQL-Injection-Risiko trotz f-String).
"""
from __future__ import annotations

import json

import asyncpg

from app.core.logging import get_logger

logger = get_logger(__name__)

# Tabellen mit Daten der nutzenden Person (Spalte user_id)
_USER_TABLES = (
    "cases", "onboarding_answers", "scenes", "echo_messages", "scale_scores",
    "reports", "topic_summaries", "case_reviews", "case_hypotheses",
    "person_profiles", "echo_chat_sessions", "user_profiles", "payments",
    "ai_usage_log",
)

# Tabellen mit Daten in der Fachpersonen-Rolle (Spalte professional_user_id)
_PROFESSIONAL_TABLES = (
    "professional_profiles", "professional_notes", "professional_echo_sessions",
    "professional_echo_messages", "professional_echo_summaries",
)


async def export_user_data(
    conn: asyncpg.Connection, user_id: str, email: str | None
) -> dict:
    """Sammelt alle bei EchoB gespeicherten Daten der Person als JSON-fähiges dict."""
    data: dict = {}

    for table in _USER_TABLES:
        data[table] = await _json_rows(conn, table, "user_id = $1", user_id)
    for table in _PROFESSIONAL_TABLES:
        data[table] = await _json_rows(conn, table, "professional_user_id = $1", user_id)

    data["case_shares"] = await _json_rows(
        conn, "case_shares", "owner_user_id = $1 OR professional_user_id = $1", user_id
    )
    data["professional_invites"] = await _json_rows(
        conn, "professional_invites",
        "inviter_user_id = $1 OR professional_user_id = $1", user_id,
    )
    if email:
        data["waitlist"] = await _json_rows_by_email(conn, "waitlist", email)

    return data


async def _json_rows(conn, table: str, where: str, user_id: str) -> list:
    val = await conn.fetchval(
        f"SELECT COALESCE(json_agg(t), '[]'::json)::text "
        f"FROM (SELECT * FROM {table} WHERE {where}) t",
        user_id,
    )
    return json.loads(val)


async def _json_rows_by_email(conn, table: str, email: str) -> list:
    val = await conn.fetchval(
        f"SELECT COALESCE(json_agg(t), '[]'::json)::text "
        f"FROM (SELECT * FROM {table} WHERE lower(email) = lower($1)) t",
        email,
    )
    return json.loads(val)


# Lösch-Reihenfolge: Kinder vor Eltern (FK-sicher). Die fall-referenzierenden
# Tabellen vor `cases`; ON DELETE CASCADE auf cases(id) fängt etwaige Reste ab
# (inkl. case_share_elements via case_shares und Profi-Notizen/Echo zu eigenen Fällen).
_DELETE_STEPS = (
    ("echo_messages", "user_id = $1"),
    ("onboarding_answers", "user_id = $1"),
    ("scenes", "user_id = $1"),
    ("scale_scores", "user_id = $1"),
    ("reports", "user_id = $1"),
    ("topic_summaries", "user_id = $1"),
    ("case_reviews", "user_id = $1"),
    ("case_hypotheses", "user_id = $1"),
    ("person_profiles", "user_id = $1"),
    ("echo_chat_sessions", "user_id = $1"),
    ("professional_echo_messages", "professional_user_id = $1"),
    ("professional_echo_summaries", "professional_user_id = $1"),
    ("professional_echo_sessions", "professional_user_id = $1"),
    ("professional_notes", "professional_user_id = $1"),
    ("case_shares", "owner_user_id = $1 OR professional_user_id = $1"),
    ("cases", "user_id = $1"),
    ("professional_invites", "inviter_user_id = $1 OR professional_user_id = $1"),
    ("professional_profiles", "user_id = $1"),
    ("payments", "user_id = $1"),
    ("ai_usage_log", "user_id = $1"),
    ("user_profiles", "user_id = $1"),
)


async def delete_user_data(
    conn: asyncpg.Connection, user_id: str, email: str | None
) -> dict:
    """Löscht in EINER Transaktion alle Daten der Person. Gibt Lösch-Zähler je Tabelle zurück."""
    counts: dict = {}
    async with conn.transaction():
        for table, where in _DELETE_STEPS:
            result = await conn.execute(f"DELETE FROM {table} WHERE {where}", user_id)
            counts[table] = _affected(result)
        if email:
            result = await conn.execute(
                "DELETE FROM waitlist WHERE lower(email) = lower($1)", email
            )
            counts["waitlist"] = _affected(result)
    return counts


def _affected(status: str) -> int:
    """Parst die asyncpg-Statusmeldung, z. B. 'DELETE 5' -> 5."""
    try:
        return int(status.rsplit(" ", 1)[-1])
    except (ValueError, AttributeError):
        return 0

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

from app.core import crypto
from app.core.logging import get_logger

logger = get_logger(__name__)

# Tabellen mit Daten der nutzenden Person (Spalte user_id)
_USER_TABLES = (
    "cases", "onboarding_answers", "scenes", "echo_messages", "scale_scores",
    "reports", "topic_summaries", "case_reviews", "case_hypotheses",
    "person_profiles", "echo_chat_sessions", "user_profiles", "payments",
    "ai_usage_log", "user_consents", "professional_profiles",
)

# Tabellen mit Daten in der Fachpersonen-Rolle (Spalte professional_user_id).
# professional_profiles NICHT hier — die Tabelle ist über user_id verknüpft (oben).
_PROFESSIONAL_TABLES = (
    "professional_notes", "professional_echo_sessions",
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

    # echo_messages-Inhalte sind ggf. feldverschlüsselt → für den Export entschlüsseln
    for msg in data.get("echo_messages", []):
        if isinstance(msg, dict) and msg.get("content") is not None:
            msg["content"] = crypto.decrypt(msg["content"])
    for sc in data.get("scenes", []):
        if isinstance(sc, dict):
            crypto.decrypt_fields(sc, "description", "user_reaction")
    for ob in data.get("onboarding_answers", []):
        if isinstance(ob, dict):
            crypto.decrypt_fields(ob, *crypto.ONBOARDING_FIELDS)
    for _tbl in ("topic_summaries", "case_hypotheses"):
        for r in data.get(_tbl, []):
            if isinstance(r, dict):
                crypto.decrypt_fields(r, "summary_text")
    for m in data.get("professional_echo_messages", []):
        if isinstance(m, dict) and m.get("content") is not None:
            m["content"] = crypto.decrypt(m["content"])
    for s in data.get("professional_echo_summaries", []):
        if isinstance(s, dict):
            crypto.decrypt_fields(s, "summary_text")
    for n in data.get("professional_notes", []):
        if isinstance(n, dict):
            crypto.decrypt_fields(
                n, "first_impressions", "key_scenes", "open_questions",
                "conversation_prompts", "next_steps", "free_text",
            )
    for r in data.get("reports", []):
        if isinstance(r, dict) and isinstance(r.get("content"), (dict, list)):
            r["content"] = crypto.decrypt_json_strings(r["content"])

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
    ("user_consents", "user_id = $1"),
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


# ── Einwilligungen (DSGVO Art. 7 Nachweispflicht) ───────────────────────────

async def get_latest_consent(conn: asyncpg.Connection, user_id: str) -> dict | None:
    """Neueste erteilte Einwilligung der Person, oder None."""
    row = await conn.fetchrow(
        "SELECT version, privacy_policy, sensitive_ai, age_confirmed, accepted_at "
        "FROM user_consents WHERE user_id = $1 ORDER BY accepted_at DESC LIMIT 1",
        user_id,
    )
    return dict(row) if row else None


async def record_consent(
    conn: asyncpg.Connection,
    user_id: str,
    version: str,
    privacy_policy: bool,
    sensitive_ai: bool,
    age_confirmed: bool,
    items: dict | None,
) -> dict:
    """Protokolliert eine erteilte Einwilligung (append-only)."""
    row = await conn.fetchrow(
        "INSERT INTO user_consents "
        "(user_id, version, privacy_policy, sensitive_ai, age_confirmed, items) "
        "VALUES ($1, $2, $3, $4, $5, $6::jsonb) "
        "RETURNING version, privacy_policy, sensitive_ai, age_confirmed, accepted_at",
        user_id, version, privacy_policy, sensitive_ai, age_confirmed, json.dumps(items or {}),
    )
    return dict(row)

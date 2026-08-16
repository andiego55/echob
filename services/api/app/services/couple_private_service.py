"""Paartherapie: der private, flankierende Echo-Dialog je Person.

**Zwei Richtungen, die man nicht verwechseln darf:**

- *Herein* darf viel: Dieser Echo kennt den **eigenen** Fall der Person (owner-only geladen)
  UND das, was im gemeinsamen Raum ohnehin für beide sichtbar ist. Genau daraus entsteht der
  Wert — die gemeinsame Sitzung im eigenen Zusammenhang betrachten.
- *Hinaus* darf nichts: Diese Zeilen sind immer auf ``(session_id, user_id)`` eingeschränkt.
  Es gibt keine Funktion, die den Dialog einer anderen Person herausgibt, und nichts hieraus
  fließt automatisch in den gemeinsamen Raum.

Der Zugang läuft zusätzlich über ``couple_session_service.require_session`` (Mitglied im
Paarraum, sonst 404).
"""
from __future__ import annotations

from typing import Any

from app.core import crypto
from app.services.couple_session_service import (
    HISTORY_LIMIT,
    build_session_context,
    build_transcript,
    load_confirmed_contexts,
    load_member_names,
    load_messages,
    require_session,
)
from app.services.echo_service import build_case_context

# So viele eigene Szenen fließen in den privaten Kontext (Kosten- und Fokusgrenze).
MAX_OWN_SCENES = 15


def own_case_id(link: dict, user_id) -> Any | None:
    """Der Anker-Fall DIESER Person aus der Kopplung (nie der der anderen)."""
    if str(link["initiator_user_id"]) == str(user_id):
        return link.get("initiator_case_id")
    if link.get("partner_user_id") and str(link["partner_user_id"]) == str(user_id):
        return link.get("partner_case_id")
    return None


async def load_own_case_context(conn, case_id, user_id) -> str:
    """Eigener Fallzusammenhang — owner-only geladen, nur für den privaten Dialog."""
    if not case_id:
        return ""
    case = await conn.fetchrow(
        "SELECT * FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not case:
        return ""

    onboarding_row = await conn.fetchrow(
        "SELECT * FROM onboarding_answers WHERE case_id = $1", case_id,
    )
    onboarding = (
        crypto.decrypt_fields(dict(onboarding_row), *crypto.ONBOARDING_FIELDS)
        if onboarding_row else None
    )
    scene_rows = await conn.fetch(
        "SELECT * FROM scenes WHERE case_id = $1 "
        "ORDER BY scene_date DESC NULLS LAST, created_at DESC LIMIT $2",
        case_id, MAX_OWN_SCENES,
    )
    scenes = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scene_rows]
    scale_rows = await conn.fetch(
        "SELECT * FROM scale_scores WHERE case_id = $1", case_id,
    )
    return build_case_context(
        case=dict(case), onboarding=onboarding, scenes=scenes,
        scale_scores=[dict(r) for r in scale_rows] or None,
    )


async def build_private_context(conn, session, link, user_id) -> str:
    """Kontext des privaten Dialogs: eigener Fall + was im Raum ohnehin sichtbar ist."""
    names = await load_member_names(conn, link)
    contexts = await load_confirmed_contexts(conn, session["id"])
    shared = build_session_context(session, contexts, names)

    own = await load_own_case_context(conn, own_case_id(link, user_id), user_id)
    parts = [
        "# Die gemeinsame Sitzung (das sehen beide)",
        shared,
    ]
    if own:
        parts += [
            "# Dein eigener Zusammenhang (vertraulich, nur in diesem Dialog)",
            "Diese Person hat das für sich allein in EchoB festgehalten. Die Partnerperson "
            "kennt davon nichts. Nutze es zum Verstehen — gib es nicht als Zitat zurück, als "
            "wäre es im Raum gesagt worden.",
            own,
        ]
    return "\n\n".join(parts)


async def load_transcript(conn, session, link) -> str:
    """Der gemeinsame Gesprächsverlauf als lesbarer Text (Grundlage fürs Feedback)."""
    names = await load_member_names(conn, link)
    messages = await load_messages(conn, session["id"])
    return build_transcript(messages, names) if messages else ""


# ── Privater Verlauf (immer auf die eigene Person eingeschränkt) ─────────────

async def load_private_messages(conn, session_id, user_id) -> list[dict]:
    rows = await conn.fetch(
        "SELECT * FROM couple_private_messages "
        "WHERE session_id = $1 AND user_id = $2 ORDER BY created_at",
        session_id, user_id,
    )
    return [crypto.decrypt_fields(dict(r), "content") for r in rows]


async def add_private_message(conn, session_id, user_id, *, role, content, kind="chat") -> dict:
    row = await conn.fetchrow(
        "INSERT INTO couple_private_messages (session_id, user_id, role, kind, content) "
        "VALUES ($1, $2, $3, $4, $5) RETURNING *",
        session_id, user_id, role, kind, crypto.encrypt(content),
    )
    return crypto.decrypt_fields(dict(row), "content")


def build_private_history(messages: list[dict]) -> list[dict[str, str]]:
    return [
        {"role": "assistant" if m["role"] == "echo" else "user", "content": m["content"]}
        for m in messages[-HISTORY_LIMIT:]
    ]


async def require_private_access(conn, session_id, user_id) -> tuple[dict, dict]:
    """Mitglied im Paarraum? Dann gehört ihm genau EIN privater Dialog dieser Sitzung."""
    return await require_session(conn, session_id, user_id)


def public_private_message(row: dict) -> dict[str, Any]:
    return {
        "id": row["id"],
        "role": row["role"],
        "kind": row["kind"],
        "content": row["content"],
        "created_at": row["created_at"],
    }

"""Paar-Begleiter: Gespräche mit Verlauf und Zusammenfassungen.

Das Vorgehen ist bewusst dasselbe wie bei den Themendialogen im Fall-Bereich — Gespräch
führen, zusammenfassen lassen, Zusammenfassung behalten. Wer EchoB allein kennt, findet
sich hier ohne Erklärung zurecht.

**Vertraulichkeit:** Fäden und Zusammenfassungen gehören der Person, die sie geführt hat.
Jede Abfrage prüft neben der Mitgliedschaft im Paarraum zusätzlich ``user_id`` — die
Partnerperson kommt an nichts davon heran, auch nicht über eine erratene ID.
"""
from __future__ import annotations

import json as _json
from typing import Any

from fastapi import HTTPException

from app.core import crypto
from app.services.couple_therapy_service import require_couple_member

#: Art eines Fadens -> Prompt-Datei. Die Art entscheidet über den Ton, mit dem Echo
#: antwortet: 'chat' ist das offene Gespräch, 'deescalation' der Einstieg nach einem
#: Streit. Registry in der Anwendung statt CHECK-Constraint in der Datenbank - eine neue
#: Art soll keine Migration kosten (siehe echo_messages.thread_type).
THREAD_KINDS: dict[str, str] = {
    "chat": "echo_couple_companion_prompt.md",
    "deescalation": "echo_couple_deescalation_prompt.md",
}

#: Wie ein Faden im Verlauf überschrieben wird, solange er keinen eigenen Namen hat.
KIND_LABELS: dict[str, str] = {
    "chat": "Gespräch",
    "deescalation": "Nach einem Streit",
}


def prompt_for(kind: str | None) -> str:
    return THREAD_KINDS.get(kind or "chat", THREAD_KINDS["chat"])


# So viele Beiträge bekommt Echo als Verlauf mit.
HISTORY_LIMIT = 40


async def ensure_open_thread(conn, couple_id, user_id, kind: str = "chat") -> dict:
    """Der laufende Faden dieser Art — oder ein neuer, wenn keiner offen ist.

    Nach Art getrennt, damit ein Streit-Einstieg nicht mitten in einem offenen Gespräch
    landet und dort den Ton wechselt.
    """
    await require_couple_member(conn, couple_id, user_id)
    if kind not in THREAD_KINDS:
        raise HTTPException(status_code=400, detail="Unbekannte Gesprächsart.")
    row = await conn.fetchrow(
        "SELECT * FROM couple_echo_threads "
        "WHERE couple_id = $1 AND user_id = $2 AND kind = $3 AND closed_at IS NULL "
        "ORDER BY updated_at DESC LIMIT 1",
        couple_id, user_id, kind,
    )
    if row:
        return crypto.decrypt_fields(dict(row), "title")
    row = await conn.fetchrow(
        "INSERT INTO couple_echo_threads (couple_id, user_id, kind) "
        "VALUES ($1, $2, $3) RETURNING *",
        couple_id, user_id, kind,
    )
    return crypto.decrypt_fields(dict(row), "title")


async def require_thread(conn, thread_id, user_id) -> dict:
    """Liefert den eigenen Faden — 404 für alle anderen, auch für die Partnerperson."""
    row = await conn.fetchrow(
        "SELECT * FROM couple_echo_threads WHERE id = $1 AND user_id = $2",
        thread_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Gespräch nicht gefunden.")
    await require_couple_member(conn, row["couple_id"], user_id)
    return crypto.decrypt_fields(dict(row), "title")


async def list_threads(conn, couple_id, user_id, kind: str | None = None) -> list[dict[str, Any]]:
    """Eigene Gespräche mit Umfang und Abschluss-Zustand.

    ``kind`` trennt die beiden Faeden-Arten: Der Begleiter zeigt seine Gespraeche, der
    Streit-Einstieg seine. Ohne Filter kaemen die Streit-Faeden im Begleiter mit heraus.
    """
    await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT t.*, "
        "(SELECT count(*) FROM couple_private_messages m WHERE m.thread_id = t.id) "
        "  AS message_count, "
        "(SELECT count(*) FROM couple_echo_summaries s WHERE s.thread_id = t.id) "
        "  AS summary_count "
        "FROM couple_echo_threads t "
        "WHERE t.couple_id = $1 AND t.user_id = $2 "
        "  AND ($3::text IS NULL OR t.kind = $3) "
        "ORDER BY t.closed_at IS NOT NULL, t.updated_at DESC",
        couple_id, user_id, kind,
    )
    return [crypto.decrypt_fields(dict(r), "title") for r in rows]


async def load_messages(conn, thread_id, user_id) -> list[dict]:
    await require_thread(conn, thread_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_private_messages WHERE thread_id = $1 AND user_id = $2 "
        "ORDER BY created_at",
        thread_id, user_id,
    )
    return [crypto.decrypt_fields(dict(r), "content") for r in rows]


async def add_message(conn, thread, user_id, *, role, content, kind="chat",
                      metadata: dict | None = None) -> dict:
    """Eine Nachricht ablegen.

    ``metadata`` traegt die Sicherheits-Markierung (``{"safety": {...}}``), damit die
    Oberflaeche eine Krisenmeldung auch nach dem Neuladen als solche rahmt - genau wie im
    Fall-Echo. Ohne sie saehe sie aus wie eine gewoehnliche Deutung.
    """
    row = await conn.fetchrow(
        "INSERT INTO couple_private_messages "
        "(couple_id, thread_id, user_id, role, kind, content, metadata) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) RETURNING *",
        thread["couple_id"], thread["id"], user_id, role, kind, crypto.encrypt(content),
        _json.dumps(metadata or {}),
    )
    await conn.execute(
        "UPDATE couple_echo_threads SET updated_at = NOW() WHERE id = $1", thread["id"],
    )
    return crypto.decrypt_fields(dict(row), "content")


def build_history(messages: list[dict]) -> list[dict[str, str]]:
    return [
        {"role": "assistant" if m["role"] == "echo" else "user", "content": m["content"]}
        for m in messages[-HISTORY_LIMIT:]
    ]


async def close_thread(conn, thread_id, user_id, *, title: str | None = None) -> dict:
    """Schließt ein Gespräch ab. Der nächste Beitrag beginnt dann einen neuen Faden."""
    await require_thread(conn, thread_id, user_id)
    row = await conn.fetchrow(
        "UPDATE couple_echo_threads SET closed_at = COALESCE(closed_at, NOW()), "
        "title = COALESCE($2::text, title), updated_at = NOW() WHERE id = $1 RETURNING *",
        thread_id, crypto.encrypt(title),
    )
    return crypto.decrypt_fields(dict(row), "title")


async def rename_thread(conn, thread_id, user_id, title: str) -> dict:
    await require_thread(conn, thread_id, user_id)
    row = await conn.fetchrow(
        "UPDATE couple_echo_threads SET title = $2, updated_at = NOW() WHERE id = $1 "
        "RETURNING *",
        thread_id, crypto.encrypt(title.strip()),
    )
    return crypto.decrypt_fields(dict(row), "title")


# ── Zusammenfassungen ────────────────────────────────────────────────────────

async def save_summary(conn, couple_id, user_id, *, text, title=None, thread_id=None) -> dict:
    await require_couple_member(conn, couple_id, user_id)
    row = await conn.fetchrow(
        "INSERT INTO couple_echo_summaries (couple_id, thread_id, user_id, title, summary_text) "
        "VALUES ($1, $2, $3, $4, $5) RETURNING *",
        couple_id, thread_id, user_id, crypto.encrypt(title), crypto.encrypt(text),
    )
    return crypto.decrypt_fields(dict(row), "title", "summary_text")


async def list_summaries(conn, couple_id, user_id, limit: int | None = None) -> list[dict]:
    """Eigene Zusammenfassungen — Grundlage für die Übersicht."""
    await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_echo_summaries WHERE couple_id = $1 AND user_id = $2 "
        "ORDER BY created_at DESC" + (" LIMIT $3" if limit else ""),
        *( (couple_id, user_id, limit) if limit else (couple_id, user_id) ),
    )
    return [crypto.decrypt_fields(dict(r), "title", "summary_text") for r in rows]


async def update_summary(conn, summary_id, user_id, *, title=None, text=None) -> dict:
    row = await conn.fetchrow(
        "UPDATE couple_echo_summaries SET title = COALESCE($3::text, title), "
        "summary_text = COALESCE($4::text, summary_text), updated_at = NOW() "
        "WHERE id = $1 AND user_id = $2 RETURNING *",
        summary_id, user_id, crypto.encrypt(title), crypto.encrypt(text),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Zusammenfassung nicht gefunden.")
    return crypto.decrypt_fields(dict(row), "title", "summary_text")


async def delete_summary(conn, summary_id, user_id) -> bool:
    result = await conn.execute(
        "DELETE FROM couple_echo_summaries WHERE id = $1 AND user_id = $2",
        summary_id, user_id,
    )
    return result != "DELETE 0"

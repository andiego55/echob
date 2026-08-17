"""Paartherapie: AI-Mediation nach dem Caucus-Modell.

Zu einem Thema hinterlegt jede Person einen **offenen** Beitrag (beide sehen ihn, mit Namen)
und optional einen **vertraulichen** (nur Echo — wie das Einzelgespräch in einer echten
Mediation). Echo erarbeitet daraus einen Vorschlag, den beide lesen.

**Die Trennung sitzt hier im Datenweg, nicht in der Sorgfalt des Aufrufers:** Es gibt genau
eine Funktion, die vertrauliche Beiträge herausgibt — ``build_mediation_input``, und deren
Ergebnis geht ausschließlich in den Prompt. Alles, was an Clients geht, läuft durch
``public_perspective``, das fremde ``private_text`` gar nicht erst in die Antwort aufnimmt.
"""
from __future__ import annotations

import json
import re
from typing import Any

from fastapi import HTTPException

from app.core import crypto
from app.services.couple_agreement_service import list_active_for_context
from app.services.couple_session_service import load_member_names
from app.services.couple_therapy_service import require_couple_member

MAX_TEXT_CHARS = 4000


# ── Themen ───────────────────────────────────────────────────────────────────

async def create_topic(conn, couple_id, user_id, *, title, description=None) -> dict:
    await require_couple_member(conn, couple_id, user_id)
    if not title.strip():
        raise HTTPException(status_code=400, detail="Das Thema braucht einen Titel.")
    row = await conn.fetchrow(
        "INSERT INTO couple_topics (couple_id, created_by, title, description) "
        "VALUES ($1, $2, $3, $4) RETURNING *",
        couple_id, user_id, title.strip(), crypto.encrypt(description),
    )
    return crypto.decrypt_fields(dict(row), "description")


async def list_topics(conn, couple_id, user_id) -> list[dict]:
    await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_topics WHERE couple_id = $1 ORDER BY created_at DESC", couple_id,
    )
    return [crypto.decrypt_fields(dict(r), "description") for r in rows]


async def require_topic(conn, topic_id, user_id) -> tuple[dict, dict]:
    """Liefert ``(topic, link)`` — oder 404, wenn die Person nicht im Paarraum ist."""
    row = await conn.fetchrow("SELECT * FROM couple_topics WHERE id = $1", topic_id)
    if not row:
        raise HTTPException(status_code=404, detail="Thema nicht gefunden.")
    link = await require_couple_member(conn, row["couple_id"], user_id)
    return crypto.decrypt_fields(dict(row), "description"), link


async def set_topic_status(conn, topic_id, user_id, status: str) -> dict:
    if status not in ("open", "resolved"):
        raise HTTPException(status_code=400, detail="Unbekannter Status.")
    await require_topic(conn, topic_id, user_id)
    row = await conn.fetchrow(
        "UPDATE couple_topics SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
        topic_id, status,
    )
    return crypto.decrypt_fields(dict(row), "description")


# ── Perspektiven ─────────────────────────────────────────────────────────────

async def save_perspective(conn, topic_id, user_id, *, open_text=None, private_text=None) -> dict:
    """Speichert den EIGENEN Beitrag. Niemand kann für eine andere Person schreiben."""
    await require_topic(conn, topic_id, user_id)
    for value in (open_text, private_text):
        if value is not None and len(value) > MAX_TEXT_CHARS:
            raise HTTPException(
                status_code=400, detail=f"Bitte höchstens {MAX_TEXT_CHARS} Zeichen.",
            )
    row = await conn.fetchrow(
        """
        INSERT INTO couple_perspectives (topic_id, user_id, open_text, private_text)
        VALUES ($1, $2, $3::text, $4::text)
        ON CONFLICT (topic_id, user_id) DO UPDATE SET
            open_text    = COALESCE(EXCLUDED.open_text, couple_perspectives.open_text),
            private_text = COALESCE(EXCLUDED.private_text, couple_perspectives.private_text),
            updated_at   = NOW()
        RETURNING *
        """,
        topic_id, user_id, crypto.encrypt(open_text), crypto.encrypt(private_text),
    )
    return _decrypt_perspective(dict(row))


async def load_perspectives(conn, topic_id) -> list[dict]:
    """Alle Beiträge — NUR für den internen Gebrauch (Prompt / Sichtbarkeitsfilter)."""
    rows = await conn.fetch(
        "SELECT * FROM couple_perspectives WHERE topic_id = $1 ORDER BY created_at", topic_id,
    )
    return [_decrypt_perspective(dict(r)) for r in rows]


def public_perspective(row: dict, viewer_id, names: dict[str, str]) -> dict[str, Any]:
    """Sicht für einen Client. Fremde vertrauliche Beiträge tauchen hier gar nicht auf.

    Die andere Person erfährt auch nicht, OB ein vertraulicher Beitrag existiert — das ist
    Teil der Caucus-Zusage.
    """
    own = str(row["user_id"]) == str(viewer_id)
    return {
        "user_id": row["user_id"],
        "name": names.get(str(row["user_id"]), "Person"),
        "is_own": own,
        "open_text": row.get("open_text"),
        "private_text": row.get("private_text") if own else None,
        "updated_at": row["updated_at"],
    }


def both_sides_ready(perspectives: list[dict], link: dict) -> bool:
    """Mediation erst, wenn BEIDE offen etwas gesagt haben — sonst wäre sie einseitig."""
    members = {str(link["initiator_user_id"])}
    if link.get("partner_user_id"):
        members.add(str(link["partner_user_id"]))
    spoke = {str(p["user_id"]) for p in perspectives if (p.get("open_text") or "").strip()}
    return len(members) == 2 and members <= spoke


# ── Mediation ────────────────────────────────────────────────────────────────

async def build_mediation_input(conn, topic, link, perspectives) -> str:
    """DER Prompt-Kontext. Einzige Stelle, an der vertrauliche Beiträge verwendet werden.

    Das Ergebnis geht ausschließlich an das Sprachmodell — nie in eine API-Antwort.
    """
    names = await load_member_names(conn, link)
    parts = [f"# Thema: {topic['title']}"]
    if topic.get("description"):
        parts.append(f"Beschreibung: {topic['description']}")

    parts.append("## Offene Beiträge (beide kennen sie)")
    for p in perspectives:
        if (p.get("open_text") or "").strip():
            parts.append(f"### {names.get(str(p['user_id']), 'Person')}\n{p['open_text']}")

    confidential = [p for p in perspectives if (p.get("private_text") or "").strip()]
    if confidential:
        parts.append(
            "## Vertrauliche Beiträge (NUR für dich – niemals zitieren oder zuordenbar "
            "wiedergeben; sie formen deinen Vorschlag, sie stehen nicht darin)"
        )
        for p in confidential:
            parts.append(f"### {names.get(str(p['user_id']), 'Person')} (vertraulich)\n{p['private_text']}")

    active = await list_active_for_context(conn, topic["couple_id"])
    if active:
        parts.append("## Geltende Abmachungen der beiden\n" + "\n".join(f"- {a}" for a in active))
    return "\n\n".join(parts)


async def save_mediation(conn, topic_id, user_id, body: str) -> dict:
    row = await conn.fetchrow(
        "INSERT INTO couple_mediations (topic_id, created_by, body) VALUES ($1, $2, $3) "
        "RETURNING *",
        topic_id, user_id, crypto.encrypt(body),
    )
    return crypto.decrypt_fields(dict(row), "body")


async def list_mediations(conn, topic_id) -> list[dict]:
    rows = await conn.fetch(
        "SELECT * FROM couple_mediations WHERE topic_id = $1 ORDER BY created_at DESC", topic_id,
    )
    return [crypto.decrypt_fields(dict(r), "body") for r in rows]


def _decrypt_perspective(row: dict) -> dict:
    return crypto.decrypt_fields(row, "open_text", "private_text")


# ── Brücken: aus dem Vorschlag werden verhandelbare Objekte ──────────────────

BRIDGE_EXTRACT_INSTRUCTION = (
    "Lies den folgenden Mediationsvorschlag und gib NUR die konkreten Vorschläge aus dem "
    "Abschnitt „Drei Brücken“ zurück — als JSON-Array, ohne Rahmentext und ohne Codeblock.\n"
    "Format: [{\"title\": \"kurzer Titel, höchstens 6 Wörter\", \"body\": \"der Vorschlag in "
    "ein bis drei Sätzen, so wie er dort steht\"}]\n"
    "Gibt es dort keine Vorschläge (etwa weil auf Hilfe verwiesen wurde), gib [] zurück.\n\n"
)


def parse_bridges(raw: str) -> list[dict[str, str]]:
    """Liest die Brücken aus Echos JSON-Antwort — tolerant gegenüber Rahmentext."""
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\s*|\s*```$", "", text)
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end <= start:
        return []
    try:
        data = json.loads(text[start:end + 1])
    except (ValueError, TypeError):
        return []
    if not isinstance(data, list):
        return []

    bruecken: list[dict[str, str]] = []
    for item in data[:5]:
        if not isinstance(item, dict):
            continue
        body = str(item.get("body") or "").strip()
        if not body:
            continue
        bruecken.append({
            "title": str(item.get("title") or "").strip()[:120] or "Vorschlag",
            "body": body[:1500],
        })
    return bruecken


async def save_bridges(conn, topic_id, bruecken: list[dict[str, str]]) -> None:
    """Legt die Brücken eines frischen Vorschlags an. Bereits verhandelte bleiben unberührt."""
    if not bruecken:
        return
    # Nur unangetastete Brücken früherer Vorschläge weichen — was das Paar schon
    # angenommen, geändert oder verworfen hat, bleibt stehen.
    await conn.execute(
        "DELETE FROM couple_bridges WHERE topic_id = $1 AND status = 'open' "
        "AND updated_by IS NULL",
        topic_id,
    )
    start = await conn.fetchval(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM couple_bridges WHERE topic_id = $1",
        topic_id,
    )
    for i, b in enumerate(bruecken):
        await conn.execute(
            "INSERT INTO couple_bridges (topic_id, position, title, body) "
            "VALUES ($1, $2, $3, $4)",
            topic_id, start + i, crypto.encrypt(b["title"]), crypto.encrypt(b["body"]),
        )


async def list_bridges(conn, topic_id) -> list[dict]:
    rows = await conn.fetch(
        "SELECT * FROM couple_bridges WHERE topic_id = $1 ORDER BY position", topic_id,
    )
    return [crypto.decrypt_fields(dict(r), "title", "body", "note") for r in rows]


async def require_bridge(conn, bridge_id, user_id) -> tuple[dict, dict, dict]:
    """Liefert ``(bridge, topic, link)`` — oder 404 für Außenstehende."""
    row = await conn.fetchrow("SELECT * FROM couple_bridges WHERE id = $1", bridge_id)
    if not row:
        raise HTTPException(status_code=404, detail="Vorschlag nicht gefunden.")
    topic, link = await require_topic(conn, row["topic_id"], user_id)
    return crypto.decrypt_fields(dict(row), "title", "body", "note"), topic, link


async def update_bridge(conn, bridge_id, user_id, *, title=None, body=None) -> dict:
    """Ändern heißt: Gegenvorschlag. Wer zuletzt geändert hat, steht danach dabei."""
    await require_bridge(conn, bridge_id, user_id)
    row = await conn.fetchrow(
        "UPDATE couple_bridges SET "
        "title = COALESCE($2::text, title), body = COALESCE($3::text, body), "
        "updated_by = $4, updated_at = NOW() WHERE id = $1 RETURNING *",
        bridge_id, crypto.encrypt(title), crypto.encrypt(body), user_id,
    )
    return crypto.decrypt_fields(dict(row), "title", "body", "note")


async def set_bridge_status(conn, bridge_id, user_id, status, *, note=None,
                            agreement_id=None) -> dict:
    if status not in ("open", "accepted", "dropped"):
        raise HTTPException(status_code=400, detail="Unbekannter Status.")
    await require_bridge(conn, bridge_id, user_id)
    row = await conn.fetchrow(
        "UPDATE couple_bridges SET status = $2, note = COALESCE($3::text, note), "
        "agreement_id = COALESCE($4, agreement_id), updated_by = $5, updated_at = NOW() "
        "WHERE id = $1 RETURNING *",
        bridge_id, status, crypto.encrypt(note), agreement_id, user_id,
    )
    return crypto.decrypt_fields(dict(row), "title", "body", "note")


# ── Gemeinsamer Diskussionsfaden am Thema ────────────────────────────────────

async def add_topic_message(conn, topic_id, *, user_id, role, content) -> dict:
    row = await conn.fetchrow(
        "INSERT INTO couple_topic_messages (topic_id, user_id, role, content) "
        "VALUES ($1, $2, $3, $4) RETURNING *",
        topic_id, user_id, role, crypto.encrypt(content),
    )
    return crypto.decrypt_fields(dict(row), "content")


async def load_topic_messages(conn, topic_id) -> list[dict]:
    rows = await conn.fetch(
        "SELECT * FROM couple_topic_messages WHERE topic_id = $1 ORDER BY created_at", topic_id,
    )
    return [crypto.decrypt_fields(dict(r), "content") for r in rows]

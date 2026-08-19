"""Paartherapie: moderierte Sitzungen im Paarraum.

**Isolations-Grundsatz (Fortsetzung von ``couple_therapy_service``):** Echo bekommt in einer
Sitzung ausschließlich, was beide Personen ausdrücklich bestätigt haben — Titel, Ziel und die
bestätigten Kontext-Beiträge — plus den Gesprächsverlauf. Dieses Modul liest deshalb **keine
Fall-Tabellen**; ``build_session_context`` kann strukturell nichts anderes einbauen.

Der KI-Entwurf für einen Kontext-Beitrag entsteht getrennt davon in
``couple_context_service`` (dort liest die Person ihren EIGENEN Fall) und wird erst durch
ausdrückliches Bestätigen zu ``confirmed_text``.

Jeder Zugriff geht über ``require_session`` → ``require_couple_member`` (404 für Fremde).
"""
from __future__ import annotations

import re
from typing import Any

from fastapi import HTTPException

from app.core import crypto
from app.services.couple_therapy_service import require_couple_member

# Kontext-Beiträge dürfen den Prompt nicht sprengen (Kostenschutz + Fokus).
MAX_CONTEXT_CHARS = 6000
# So viele Beiträge bekommt Echo als Verlauf mit.
HISTORY_LIMIT = 40

# Stimmungs-Check vor dem Gespräch (Kürzel → Klartext für Echo und Anzeige).
MOOD_LABELS: dict[str, str] = {
    "ruhig":       "ruhig und offen",
    "angespannt":  "angespannt",
    "traurig":     "traurig",
    "wuetend":     "wütend",
    "erschoepft":  "erschöpft",
    "hoffnungsvoll": "hoffnungsvoll",
}


async def create_session(conn, couple_id, user_id, *, title, topic=None, goal=None) -> dict:
    """Legt eine Sitzung im Paarraum an (Status ``draft`` = in Vorbereitung)."""
    await require_couple_member(conn, couple_id, user_id)
    row = await conn.fetchrow(
        "INSERT INTO couple_sessions (couple_id, created_by, title, topic, goal) "
        "VALUES ($1, $2, $3, $4, $5) RETURNING *",
        couple_id, user_id, title.strip(),
        crypto.encrypt(topic), crypto.encrypt(goal),
    )
    return _decrypt_session(dict(row))


async def list_sessions(conn, couple_id, user_id) -> list[dict]:
    await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_sessions WHERE couple_id = $1 ORDER BY created_at DESC",
        couple_id,
    )
    return [_decrypt_session(dict(r)) for r in rows]


async def require_session(conn, session_id, user_id) -> tuple[dict, dict]:
    """Liefert ``(session, link)`` — oder 404, wenn die Person nicht im Paarraum ist."""
    row = await conn.fetchrow("SELECT * FROM couple_sessions WHERE id = $1", session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Sitzung nicht gefunden.")
    link = await require_couple_member(conn, row["couple_id"], user_id)
    return _decrypt_session(dict(row)), link


async def update_session(conn, session_id, user_id, *, title=None, topic=None, goal=None) -> dict:
    session, _ = await require_session(conn, session_id, user_id)
    row = await conn.fetchrow(
        "UPDATE couple_sessions SET "
        "title = COALESCE($2, title), topic = COALESCE($3, topic), goal = COALESCE($4, goal) "
        "WHERE id = $1 RETURNING *",
        session_id,
        title.strip() if title is not None else None,
        crypto.encrypt(topic) if topic is not None else None,
        crypto.encrypt(goal) if goal is not None else None,
    )
    return _decrypt_session(dict(row))


async def set_status(conn, session_id, user_id, status: str) -> dict:
    """``open`` startet die Sitzung, ``closed`` schließt sie ab."""
    if status not in ("draft", "proposed", "open", "closed"):
        raise HTTPException(status_code=400, detail="Unbekannter Status.")
    await require_session(conn, session_id, user_id)
    row = await conn.fetchrow(
        "UPDATE couple_sessions SET status = $2, "
        "opened_at = CASE WHEN $2 = 'open' AND opened_at IS NULL THEN NOW() ELSE opened_at END, "
        "closed_at = CASE WHEN $2 = 'closed' THEN NOW() ELSE NULL END "
        "WHERE id = $1 RETURNING *",
        session_id, status,
    )
    return _decrypt_session(dict(row))


# ── Vorschlag, Annahme, Verabredung ──────────────────────────────────────────

async def propose(conn, session_id, user_id) -> dict:
    """Schlägt der anderen Person das Gespräch vor (aus der eigenen Vorbereitung heraus)."""
    session, _ = await require_session(conn, session_id, user_id)
    if session["status"] not in ("draft", "proposed"):
        raise HTTPException(status_code=400, detail="Dieses Gespräch läuft schon.")
    row = await conn.fetchrow(
        "UPDATE couple_sessions SET status = 'proposed', proposed_at = NOW(), "
        "declined_at = NULL WHERE id = $1 RETURNING *",
        session_id,
    )
    return _decrypt_session(dict(row))


async def respond(conn, session_id, user_id, accept: bool) -> dict:
    """Annehmen oder ablehnen — bewusst nur durch die jeweils ANDERE Person."""
    session, link = await require_session(conn, session_id, user_id)
    if session["status"] != "proposed":
        raise HTTPException(status_code=400, detail="Hier steht gerade kein Vorschlag offen.")
    if str(session["created_by"]) == str(user_id):
        raise HTTPException(
            status_code=400,
            detail="Auf deinen eigenen Vorschlag antwortet die andere Person.",
        )
    if accept:
        row = await conn.fetchrow(
            "UPDATE couple_sessions SET accepted_by = $2, accepted_at = NOW(), "
            "declined_at = NULL WHERE id = $1 RETURNING *",
            session_id, user_id,
        )
    else:
        row = await conn.fetchrow(
            "UPDATE couple_sessions SET status = 'draft', declined_at = NOW(), "
            "accepted_by = NULL, accepted_at = NULL WHERE id = $1 RETURNING *",
            session_id,
        )
    return _decrypt_session(dict(row))


async def schedule(conn, session_id, user_id, when) -> dict:
    """Setzt (oder löscht) die Verabredung — die Dialogeinladung mit Zeitpunkt."""
    await require_session(conn, session_id, user_id)
    row = await conn.fetchrow(
        "UPDATE couple_sessions SET scheduled_for = $2 WHERE id = $1 RETURNING *",
        session_id, when,
    )
    return _decrypt_session(dict(row))


# ── Kontext-Beiträge ─────────────────────────────────────────────────────────

async def get_own_context(conn, session_id, user_id) -> dict | None:
    """Der eigene Beitrag inklusive Entwurf (den nur die verfassende Person sieht)."""
    await require_session(conn, session_id, user_id)
    row = await conn.fetchrow(
        "SELECT * FROM couple_session_contexts WHERE session_id = $1 AND user_id = $2",
        session_id, user_id,
    )
    return _decrypt_context(dict(row)) if row else None


async def save_context(
    conn, session_id, user_id, *,
    draft_text=None, confirmed_text=None, instruction=None, source_elements=None,
    mood=None, appreciation=None,
) -> dict:
    """Legt den eigenen Beitrag an oder aktualisiert ihn.

    ``confirmed_text`` ist der Text, der tatsächlich an Echo geht und im Paarraum sichtbar
    ist — er entsteht ausschließlich hier, durch ausdrückliches Bestätigen der Person.
    """
    await require_session(conn, session_id, user_id)
    if confirmed_text is not None and len(confirmed_text) > MAX_CONTEXT_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Der Kontext ist zu lang (max. {MAX_CONTEXT_CHARS} Zeichen).",
        )
    row = await conn.fetchrow(
        """
        INSERT INTO couple_session_contexts
            (session_id, user_id, draft_text, confirmed_text, instruction, source_elements,
             mood, appreciation, confirmed_at)
        VALUES ($1, $2, $3::text, $4::text, $5::text, COALESCE($6::text[], '{}'::text[]),
                $7::text, $8::text,
                CASE WHEN $4::text IS NULL THEN NULL ELSE NOW() END)
        ON CONFLICT (session_id, user_id) DO UPDATE SET
            draft_text      = COALESCE(EXCLUDED.draft_text, couple_session_contexts.draft_text),
            confirmed_text  = COALESCE(EXCLUDED.confirmed_text, couple_session_contexts.confirmed_text),
            instruction     = COALESCE(EXCLUDED.instruction, couple_session_contexts.instruction),
            source_elements = COALESCE($6::text[], couple_session_contexts.source_elements),
            mood            = COALESCE(EXCLUDED.mood, couple_session_contexts.mood),
            appreciation    = COALESCE(EXCLUDED.appreciation, couple_session_contexts.appreciation),
            confirmed_at    = CASE WHEN EXCLUDED.confirmed_text IS NULL
                                   THEN couple_session_contexts.confirmed_at ELSE NOW() END,
            updated_at      = NOW()
        RETURNING *
        """,
        session_id, user_id,
        crypto.encrypt(draft_text),
        crypto.encrypt(confirmed_text),
        crypto.encrypt(instruction),
        source_elements,
        mood,
        crypto.encrypt(appreciation),
    )
    return _decrypt_context(dict(row))


async def load_confirmed_contexts(conn, session_id) -> list[dict]:
    """Alle BESTÄTIGTEN Beiträge — die einzige Kontextquelle der Moderation."""
    rows = await conn.fetch(
        "SELECT user_id, confirmed_text, instruction, mood, appreciation "
        "FROM couple_session_contexts "
        "WHERE session_id = $1 AND confirmed_text IS NOT NULL ORDER BY confirmed_at",
        session_id,
    )
    return [_decrypt_context(dict(r)) for r in rows]


def build_session_context(
    session: dict, contexts: list[dict], names: dict[str, str], mediation: str | None = None,
) -> str:
    """DER Kontext für den Moderations-Echo — nichts als ausdrücklich Bestätigtes.

    Bewusst ein reiner String-Bau ohne DB-Zugriff: es gibt hier keine Stelle, an der
    Fall-Inhalte einsickern könnten.
    """
    parts = [f"# Sitzung: {session['title']}"]
    if session.get("topic"):
        parts.append(f"## Worum es geht\n{session['topic']}")
    if session.get("goal"):
        parts.append(f"## Ziel der beiden\n{session['goal']}")
    if mediation:
        # Stammt die Sitzung aus einer Mediation, liegt der Vorschlag mit auf dem Tisch —
        # beide kennen ihn ohnehin.
        parts.append(
            "## Dein früherer Mediationsvorschlag zu diesem Thema\n"
            "Beide haben ihn gelesen. Ihr sprecht jetzt darüber, was davon trägt.\n\n"
            + mediation
        )

    if contexts:
        parts.append("## Was die beiden für diese Sitzung mitgeteilt haben")
        for c in contexts:
            name = names.get(str(c["user_id"]), "Eine Person")
            parts.append(f"### Von {name}\n{c['confirmed_text']}")
            if c.get("mood"):
                parts.append(f"Stimmung von {name} vor dem Gespräch: {MOOD_LABELS.get(c['mood'], c['mood'])}")
            if c.get("appreciation"):
                parts.append(f"{name} schätzt an der anderen Person: {c['appreciation']}")
            if c.get("instruction"):
                parts.append(f"Ausdrücklicher Hinweis von {name} an dich: {c['instruction']}")
    else:
        parts.append(
            "## Hinweis\nEs liegt noch kein Kontext vor. Frage im Raum behutsam nach, "
            "worum es gehen soll."
        )
    return "\n\n".join(parts)


# ── Nachrichten ──────────────────────────────────────────────────────────────

async def add_message(conn, session_id, *, user_id, role: str, content: str) -> dict:
    row = await conn.fetchrow(
        "INSERT INTO couple_session_messages (session_id, user_id, role, content) "
        "VALUES ($1, $2, $3, $4) RETURNING *",
        session_id, user_id, role, crypto.encrypt(content),
    )
    return _decrypt_message(dict(row))


async def load_messages(conn, session_id, limit: int | None = None) -> list[dict]:
    rows = await conn.fetch(
        "SELECT * FROM couple_session_messages WHERE session_id = $1 ORDER BY created_at",
        session_id,
    )
    msgs = [_decrypt_message(dict(r)) for r in rows]
    return msgs[-limit:] if limit else msgs


def addresses_echo(text: str) -> bool:
    """Spricht dieser Beitrag Echo direkt an?

    Bewusst eng gefasst: nur am Satzanfang (»Echo, was meinst du?«) oder per »@Echo«.
    Wer über Echo redet (»…, das hat Echo vorhin gesagt«), ruft es damit nicht herbei —
    sonst würde die Moderation ungefragt in jedes zweite Wort platzen.
    """
    t = (text or "").strip().lower()
    return bool(re.match(r"^@?echo\b", t)) or "@echo" in t


def build_transcript(messages: list[dict], names: dict[str, str]) -> str:
    """Der gemeinsame Verlauf als lesbarer Text (für Zusammenfassung und Feedback)."""
    return "\n".join(
        f"{'Echo' if m['role'] == 'echo' else names.get(str(m['user_id']), 'Person')}: "
        f"{m['content']}"
        for m in messages
    )


def build_history(messages: list[dict], names: dict[str, str]) -> list[dict[str, str]]:
    """Verlauf für das LLM. Wer spricht, steckt im Text — es sind drei Stimmen im Raum."""
    history: list[dict[str, str]] = []
    for m in messages[-HISTORY_LIMIT:]:
        if m["role"] == "echo":
            history.append({"role": "assistant", "content": m["content"]})
        else:
            name = names.get(str(m["user_id"]), "Person")
            history.append({"role": "user", "content": f"{name}: {m['content']}"})
    return history


# ── Entschlüsselung ──────────────────────────────────────────────────────────

def _decrypt_session(row: dict) -> dict:
    return crypto.decrypt_fields(row, "topic", "goal")


def _decrypt_context(row: dict) -> dict:
    return crypto.decrypt_fields(
        row, "draft_text", "confirmed_text", "instruction", "appreciation",
    )


def _decrypt_message(row: dict) -> dict:
    return crypto.decrypt_fields(row, "content")


def public_message(row: dict, names: dict[str, str]) -> dict[str, Any]:
    """Sitzungsnachricht für die API — beide Seiten sehen denselben Verlauf."""
    return {
        "id": row["id"],
        "role": row["role"],
        "user_id": row["user_id"],
        "speaker": "Echo" if row["role"] == "echo" else names.get(str(row["user_id"]), "Person"),
        "content": row["content"],
        "created_at": row["created_at"],
    }


async def load_member_profiles(conn, link: dict) -> dict[str, dict]:
    """Anzeigename und Avatar beider Mitglieder — mehr geht im Paarraum nicht über."""
    profile: dict[str, dict] = {}
    for idx, key in enumerate(("initiator_user_id", "partner_user_id")):
        uid = link.get(key)
        if not uid:
            continue
        row = await conn.fetchrow(
            "SELECT display_name, avatar FROM user_profiles WHERE user_id = $1", uid,
        )
        profile[str(uid)] = {
            "name": (row["display_name"] if row else None) or f"Person {'AB'[idx]}",
            "avatar": row["avatar"] if row else None,
        }
    return profile


async def load_member_names(conn, link: dict) -> dict[str, str]:
    """Anzeigenamen beider Mitglieder (Fallback: neutrale Bezeichnung)."""
    names: dict[str, str] = {}
    for idx, key in enumerate(("initiator_user_id", "partner_user_id")):
        uid = link.get(key)
        if not uid:
            continue
        display = await conn.fetchval(
            "SELECT display_name FROM user_profiles WHERE user_id = $1", uid,
        )
        names[str(uid)] = display or f"Person {'AB'[idx]}"
    return names


__all__ = [
    "MAX_CONTEXT_CHARS",
    "add_message",
    "addresses_echo",
    "build_history",
    "build_session_context",
    "create_session",
    "get_own_context",
    "list_sessions",
    "load_confirmed_contexts",
    "load_member_names",
    "load_messages",
    "public_message",
    "require_session",
    "save_context",
    "set_status",
    "update_session",
]

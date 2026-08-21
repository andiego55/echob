"""Paartherapie: die offene Frage an die Partnerperson.

**Die Luecke, die das schliesst.** Im Paarraum konnte man Echo alles fragen und die andere
Person fast nichts. Fuer sie gab es nur schwere Wege (eine moderierte Sitzung, eine
Mediation), enge (den festen Wochen-Check-in) oder einseitige (die Wertschaetzungswand).
Eine schlichte Frage - "Warum war dir der Abend bei deinen Eltern so wichtig?" - hatte
keinen Ort.

**Warum genau eine Antwort.** Es waere leicht, daraus einen Faden zu machen. Genau das ist
aber der eine Kanal, den dieses Modul bewusst nicht anbietet: unmoderiertes Hin und Her
zwischen zwei Menschen, die gerade streiten, spitzt zu statt zu klaeren. Eine Frage, eine
Antwort, fertig. Wer weiterreden will, macht daraus ein Gespraech - dafuer gibt es den
Weiterfuehren-Block in der Oberflaeche.

**Trennung:** eigene Tabelle ``couple_questions``, alles ueber ``require_couple_member``,
kein Zugriff auf Fall-Daten, kein Echo-Aufruf. Die Frage ist zwischen den beiden.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException

from app.core import crypto
from app.services.couple_session_service import load_member_names
from app.services.couple_therapy_service import require_couple_member

MAX_CHARS = 800

# Anstoesse fuer den Fall, dass einem die Frage nicht einfaellt - dieselbe Rolle wie die
# Impulse im Echo-Dialog. Bewusst neugierig statt pruefend: keine Frage, die eine richtige
# Antwort hat, und keine, die eine Rechtfertigung verlangt.
ANSTOESSE: list[str] = [
    "Was hat dir diese Woche gutgetan, das ich vielleicht gar nicht mitbekommen habe?",
    "Wann hast du dich zuletzt von mir wirklich verstanden gefuehlt?",
    "Gibt es etwas, das du dir schon laenger von mir wuenschst, aber nicht sagst?",
    "Was denkst du, brauche ich gerade - und liege ich damit richtig?",
    "Woran merkst du, dass es mir gut geht?",
    "Was war fuer dich der schoenste gemeinsame Moment im letzten Monat?",
    "Wovor hast du gerade am meisten Angst, wenn du an uns denkst?",
    "Was tue ich, ohne es zu merken, das dir wehtut?",
    "Was hat sich bei uns im letzten Jahr zum Guten veraendert?",
    "Wenn du einen Tag mit mir frei haettest - was wuerdest du machen wollen?",
]


def _entschluesseln(row: dict) -> dict:
    return crypto.decrypt_fields(dict(row), "question", "answer")


def _sicht(row: dict, user_id, names: dict) -> dict:
    """Eine Frage aus der Sicht der abrufenden Person.

    ``is_mine`` heisst: von mir gestellt, also warte ich. ``waiting_for_me`` heisst: an mich
    gerichtet und noch offen - genau das gehoert aufs Dashboard.
    """
    von_mir = str(row["asked_by"]) == str(user_id)
    return {
        "id": row["id"],
        "couple_id": row["couple_id"],
        "question": row["question"],
        "answer": row.get("answer"),
        "status": row["status"],
        "is_mine": von_mir,
        "waiting_for_me": (not von_mir) and row["status"] == "open",
        "asked_by_name": names.get(str(row["asked_by"])) or "Partnerperson",
        "answered_at": row.get("answered_at"),
        "created_at": row["created_at"],
    }


async def ask(conn, couple_id, user_id, question: str) -> dict:
    """Eine Frage dalassen. Sie wartet, bis die andere Person Zeit hat."""
    link = await require_couple_member(conn, couple_id, user_id)
    text = (question or "").strip()[:MAX_CHARS]
    if not text:
        raise HTTPException(status_code=400, detail="Die Frage ist leer.")

    # Ein Deckel, damit niemand eine Wand aus Fragen vorfindet, wenn er zurueckkommt.
    offen = await conn.fetchval(
        "SELECT count(*) FROM couple_questions "
        "WHERE couple_id = $1 AND asked_by = $2 AND status = 'open'",
        couple_id, user_id,
    )
    if offen >= 5:
        raise HTTPException(
            status_code=400,
            detail="Fünf offene Fragen sind genug. Warte erst eine Antwort ab.",
        )

    row = await conn.fetchrow(
        "INSERT INTO couple_questions (couple_id, asked_by, question) "
        "VALUES ($1, $2, $3) RETURNING *",
        couple_id, user_id, crypto.encrypt(text),
    )
    names = await load_member_names(conn, link)
    return _sicht(_entschluesseln(row), user_id, names)


async def answer(conn, question_id: UUID, user_id, text: str) -> dict:
    """Antworten darf nur, wer gefragt WURDE - und nur einmal."""
    row = await conn.fetchrow("SELECT * FROM couple_questions WHERE id = $1", question_id)
    if not row:
        raise HTTPException(status_code=404, detail="Frage nicht gefunden.")

    link = await require_couple_member(conn, row["couple_id"], user_id)
    if str(row["asked_by"]) == str(user_id):
        raise HTTPException(status_code=403, detail="Das ist deine eigene Frage.")
    if row["status"] != "open":
        raise HTTPException(status_code=400, detail="Diese Frage ist nicht mehr offen.")

    antwort = (text or "").strip()[:MAX_CHARS]
    if not antwort:
        raise HTTPException(status_code=400, detail="Die Antwort ist leer.")

    neu = await conn.fetchrow(
        "UPDATE couple_questions SET answer = $2, answered_at = clock_timestamp(), "
        "status = 'answered', updated_at = clock_timestamp() WHERE id = $1 RETURNING *",
        question_id, crypto.encrypt(antwort),
    )
    names = await load_member_names(conn, link)
    return _sicht(_entschluesseln(neu), user_id, names)


async def withdraw(conn, question_id: UUID, user_id) -> dict:
    """Die eigene Frage zurueckziehen - solange sie noch offen ist."""
    row = await conn.fetchrow("SELECT * FROM couple_questions WHERE id = $1", question_id)
    if not row:
        raise HTTPException(status_code=404, detail="Frage nicht gefunden.")
    link = await require_couple_member(conn, row["couple_id"], user_id)
    if str(row["asked_by"]) != str(user_id):
        raise HTTPException(status_code=403, detail="Nur die eigene Frage lässt sich zurückziehen.")
    if row["status"] != "open":
        raise HTTPException(status_code=400, detail="Beantwortete Fragen bleiben stehen.")

    neu = await conn.fetchrow(
        "UPDATE couple_questions SET status = 'withdrawn', updated_at = clock_timestamp() "
        "WHERE id = $1 RETURNING *",
        question_id,
    )
    names = await load_member_names(conn, link)
    return _sicht(_entschluesseln(neu), user_id, names)


async def load_all(conn, couple_id, user_id, limit: int = 40) -> dict:
    """Alles, was der Raum an Fragen kennt - beantwortete bleiben als Gedaechtnis stehen."""
    link = await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_questions WHERE couple_id = $1 AND status <> 'withdrawn' "
        "ORDER BY (status = 'open') DESC, created_at DESC LIMIT $2",
        couple_id, limit,
    )
    names = await load_member_names(conn, link)
    fragen = [_sicht(_entschluesseln(r), user_id, names) for r in rows]
    return {
        "questions": fragen,
        "waiting_for_me": sum(1 for f in fragen if f["waiting_for_me"]),
        "waiting_for_partner": sum(1 for f in fragen if f["is_mine"] and f["status"] == "open"),
        "prompts": ANSTOESSE,
    }


async def load_open_for_dashboard(conn, couple_id, user_id) -> list[dict]:
    """Nur die offenen - das Dashboard braucht nicht das Archiv."""
    link = await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_questions WHERE couple_id = $1 AND status = 'open' "
        "ORDER BY created_at DESC",
        couple_id,
    )
    names = await load_member_names(conn, link)
    return [_sicht(_entschluesseln(r), user_id, names) for r in rows]

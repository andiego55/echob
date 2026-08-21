"""Paartherapie: Sitzungs-Zusammenfassungen und Abmachungen.

Beides gehört **beiden** und ist im Paarraum für beide sichtbar. Die Zusammenfassung entsteht
ausschließlich aus dem gemeinsamen Verlauf und den bestätigten Kontexten — dieses Modul liest
weder Fall-Tabellen noch private Dialoge.

Eine Abmachung gilt erst, wenn die jeweils andere Person zustimmt (``propose`` → ``accept``);
niemand kann sich selbst eine Abmachung bestätigen.
"""
from __future__ import annotations

from fastapi import HTTPException

from app.core import crypto
from app.services.couple_session_service import require_session
from app.services.couple_therapy_service import partner_of, require_couple_member

OPEN_STATUSES = ("proposed", "active")


# ── Zusammenfassungen ────────────────────────────────────────────────────────

async def save_summary(conn, session_id, user_id, summary_text: str) -> dict:
    await require_session(conn, session_id, user_id)
    row = await conn.fetchrow(
        "INSERT INTO couple_session_summaries (session_id, created_by, summary_text) "
        "VALUES ($1, $2, $3) RETURNING *",
        session_id, user_id, crypto.encrypt(summary_text),
    )
    return crypto.decrypt_fields(dict(row), "summary_text")


async def list_summaries(conn, session_id, user_id) -> list[dict]:
    await require_session(conn, session_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_session_summaries WHERE session_id = $1 "
        "ORDER BY created_at DESC",
        session_id,
    )
    return [crypto.decrypt_fields(dict(r), "summary_text") for r in rows]


# ── Abmachungen ──────────────────────────────────────────────────────────────

async def delete_summary(conn, summary_id, user_id) -> bool:
    """Eine Zusammenfassung loeschen - jede Person im Raum darf das.

    Der Knopf legt bei jedem Druck eine NEUE an. Wer zweimal drueckt, hat zwei fast gleiche
    Texte untereinander stehen und keinen Weg zurueck. Die Zusammenfassung gehoert beiden,
    also darf sie auch jeder von beiden wegraeumen - genau wie beim Rueckblick.
    """
    row = await conn.fetchrow(
        "SELECT s.session_id, x.couple_id FROM couple_session_summaries s "
        "JOIN couple_sessions x ON x.id = s.session_id WHERE s.id = $1",
        summary_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Zusammenfassung nicht gefunden.")
    await require_couple_member(conn, row["couple_id"], user_id)
    await conn.execute("DELETE FROM couple_session_summaries WHERE id = $1", summary_id)
    return True


async def propose(conn, couple_id, user_id, *, body: str, session_id=None, due_at=None,
                  topic_id=None) -> dict:
    """Schlägt eine Abmachung vor. Sie gilt erst, wenn die andere Person zustimmt."""
    await require_couple_member(conn, couple_id, user_id)
    text = body.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Die Abmachung braucht einen Text.")
    row = await conn.fetchrow(
        "INSERT INTO couple_agreements (couple_id, session_id, topic_id, body, proposed_by, "
        "due_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        couple_id, session_id, topic_id, crypto.encrypt(text), user_id, due_at,
    )
    return crypto.decrypt_fields(dict(row), "body", "review_note")


async def withdraw(conn, agreement_id, user_id) -> bool:
    """Den eigenen Vorschlag zuruecknehmen - solange niemand zugestimmt hat.

    ``dropped`` gibt es schon, aber das erzaehlt eine andere Geschichte: Es laesst die
    Abmachung als "Verworfen" in der Liste stehen, und das liest sich wie "wir haben es
    versucht und es hat nicht geklappt". Fuer einen Vertipper oder einen Vorschlag, den man
    sofort bereut, ist das die falsche Geschichte.

    Sobald zugestimmt wurde, ist es eine gemeinsame Zusage. Die verschwindet nicht still -
    dann ist ``dropped`` genau richtig, weil es ehrlich festhaelt, dass etwas nicht
    weiterverfolgt wird.
    """
    row = await conn.fetchrow("SELECT * FROM couple_agreements WHERE id = $1", agreement_id)
    if not row:
        raise HTTPException(status_code=404, detail="Abmachung nicht gefunden.")
    await require_couple_member(conn, row["couple_id"], user_id)
    if str(row["proposed_by"]) != str(user_id):
        raise HTTPException(
            status_code=403, detail="Zurücknehmen kann nur, wer vorgeschlagen hat.",
        )
    if row["status"] != "proposed" or row["accepted_by"]:
        raise HTTPException(
            status_code=400,
            detail="Dazu gab es schon eine Zusage – verwerfen statt zurücknehmen.",
        )
    await conn.execute("DELETE FROM couple_agreements WHERE id = $1", agreement_id)
    return True


async def accept(conn, agreement_id, user_id) -> dict:
    """Nimmt eine vorgeschlagene Abmachung an — nur die jeweils ANDERE Person kann das."""
    row = await conn.fetchrow("SELECT * FROM couple_agreements WHERE id = $1", agreement_id)
    if not row:
        raise HTTPException(status_code=404, detail="Abmachung nicht gefunden.")
    link = await require_couple_member(conn, row["couple_id"], user_id)

    if str(row["proposed_by"]) == str(user_id):
        raise HTTPException(
            status_code=400,
            detail="Eine Abmachung wird von der anderen Person bestätigt.",
        )
    if row["status"] != "proposed":
        raise HTTPException(status_code=400, detail="Diese Abmachung wartet nicht mehr.")
    # Sicherheitsnetz: nur wer wirklich Gegenüber des Vorschlags ist.
    if str(partner_of(link, row["proposed_by"]) or "") != str(user_id):
        raise HTTPException(status_code=403, detail="Nicht zulässig.")

    updated = await conn.fetchrow(
        "UPDATE couple_agreements SET status = 'active', accepted_by = $2, "
        "accepted_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *",
        agreement_id, user_id,
    )
    return crypto.decrypt_fields(dict(updated), "body", "review_note")


async def set_status(conn, agreement_id, user_id, status: str) -> dict:
    """Hält fest, wie es gelaufen ist (``kept``) oder verwirft die Abmachung (``dropped``)."""
    if status not in ("kept", "dropped"):
        raise HTTPException(status_code=400, detail="Unbekannter Status.")
    row = await conn.fetchrow("SELECT * FROM couple_agreements WHERE id = $1", agreement_id)
    if not row:
        raise HTTPException(status_code=404, detail="Abmachung nicht gefunden.")
    await require_couple_member(conn, row["couple_id"], user_id)
    if status == "kept" and row["status"] != "active":
        raise HTTPException(
            status_code=400,
            detail="Nur eine geltende Abmachung kann als gehalten markiert werden.",
        )
    updated = await conn.fetchrow(
        "UPDATE couple_agreements SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
        agreement_id, status,
    )
    return crypto.decrypt_fields(dict(updated), "body", "review_note")


# ── Nachfrage: "Wie lief es?" ────────────────────────────────────────────────
# ``due_at`` gab es von Anfang an, aber nichts hat je danach gefragt. Ohne Nachfrage ist
# eine Abmachung nur ein guter Vorsatz. ``reviewed_at`` verhindert, dass dieselbe Frage
# ewig wiederkommt.

REVIEW_OUTCOMES = ("kept", "again", "dropped")


async def list_due(conn, couple_id, user_id) -> list[dict]:
    """Geltende Abmachungen, deren Termin erreicht ist und die noch keiner bewertet hat."""
    await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_agreements "
        "WHERE couple_id = $1 AND status = 'active' "
        "  AND due_at IS NOT NULL AND due_at <= NOW() AND reviewed_at IS NULL "
        "ORDER BY due_at",
        couple_id,
    )
    return [crypto.decrypt_fields(dict(r), "body", "review_note") for r in rows]


async def review(conn, agreement_id, user_id, outcome: str, note: str | None = None) -> dict:
    """Haelt fest, wie es gelaufen ist.

    ``kept`` schliesst ab, ``dropped`` verwirft, ``again`` verschiebt die Nachfrage um eine
    Woche - fuer das, was noch in Arbeit ist. Nur ``again`` laesst ``reviewed_at`` leer,
    damit die Frage wiederkommt.
    """
    if outcome not in REVIEW_OUTCOMES:
        raise HTTPException(status_code=400, detail="Unbekannte Rueckmeldung.")
    row = await conn.fetchrow("SELECT * FROM couple_agreements WHERE id = $1", agreement_id)
    if not row:
        raise HTTPException(status_code=404, detail="Abmachung nicht gefunden.")
    await require_couple_member(conn, row["couple_id"], user_id)

    notiz = crypto.encrypt(note.strip()[:500]) if note and note.strip() else None
    if outcome == "again":
        updated = await conn.fetchrow(
            "UPDATE couple_agreements SET due_at = NOW() + INTERVAL '7 days', "
            "review_note = COALESCE($2, review_note), updated_at = NOW() "
            "WHERE id = $1 RETURNING *",
            agreement_id, notiz,
        )
    else:
        updated = await conn.fetchrow(
            "UPDATE couple_agreements SET status = $2, reviewed_at = NOW(), "
            "review_note = COALESCE($3, review_note), updated_at = NOW() "
            "WHERE id = $1 RETURNING *",
            agreement_id, "kept" if outcome == "kept" else "dropped", notiz,
        )
    return crypto.decrypt_fields(dict(updated), "body", "review_note")


async def list_agreements(conn, couple_id, user_id) -> list[dict]:
    await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_agreements WHERE couple_id = $1 ORDER BY created_at DESC",
        couple_id,
    )
    return [crypto.decrypt_fields(dict(r), "body", "review_note") for r in rows]


async def list_active_for_context(conn, couple_id) -> list[str]:
    """Geltende Abmachungen als Text — damit Echo an sie erinnern kann."""
    rows = await conn.fetch(
        "SELECT body FROM couple_agreements WHERE couple_id = $1 AND status = 'active' "
        "ORDER BY created_at",
        couple_id,
    )
    return [crypto.decrypt_fields(dict(r), "body")["body"] for r in rows]

"""Paartherapie: das Stimmungsbarometer der Beziehung.

Ein Regler von 1 bis 10, den jede Person für sich stellt und die andere **immer** sieht.
Der niedrigschwelligste Anlass im ganzen Modul — kein Formular, kein Termin, zwei Sekunden.

**Zustand, kein Urteil.** Gefragt wird, wie es *dir gerade mit euch* geht, nicht wie gut die
andere Person ihre Sache macht. Die optionale Notiz ist deshalb wichtiger, als sie aussieht:
Sie verhindert, dass eine niedrige Zahl als stummer Vorwurf im Raum steht.

**Bewusst ohne Blindheitsregel** — wie bei der Wertschätzung, anders als beim Check-in. Ein
Barometer, das man erst sieht, wenn man selbst eingestellt hat, wäre kein Barometer.

**Anhängend statt überschreibend:** Jede Einstellung ist eine neue Zeile, der aktuelle Wert
ist die jüngste. Das kostet fast nichts und schenkt uns den Verlauf über die Zeit.
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.core import crypto
from app.services.couple_session_service import load_member_names
from app.services.couple_therapy_service import partner_of, require_couple_member

MIN_VALUE, MAX_VALUE = 1, 10
NOTE_MAX_CHARS = 300

#: Was die Zahlen bedeuten. Bewusst über Nähe formuliert und nicht über „gut/schlecht" —
#: eine Beziehung ist keine Note.
LEVEL_LABELS: dict[int, str] = {
    1: "weit weg",
    2: "weit weg",
    3: "angespannt",
    4: "angespannt",
    5: "durchwachsen",
    6: "durchwachsen",
    7: "ganz gut",
    8: "ganz gut",
    9: "nah",
    10: "sehr verbunden",
}

#: Ab diesem Absacken erfährt die andere Person davon — eine Meldung bei jedem
#: Regler-Zupfen wäre Lärm, ein deutlicher Einbruch ist genau der Moment zum Nachfragen.
DROP_NOTICE = 2


def label_for(value: int | None) -> str | None:
    return LEVEL_LABELS.get(value) if value is not None else None


def _decrypt(row: dict) -> dict:
    return crypto.decrypt_fields(dict(row), "note")


async def _latest(conn, couple_id, user_id) -> dict | None:
    row = await conn.fetchrow(
        "SELECT * FROM couple_barometer_readings "
        "WHERE couple_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1",
        couple_id, user_id,
    )
    return _decrypt(row) if row else None


async def set_value(conn, couple_id, user_id, value: int, note: str | None = None) -> dict:
    """Stellt den eigenen Regler. Gibt den neuen Stand und den vorherigen Wert zurück.

    Der vorherige Wert wandert mit heraus, damit der Aufrufer entscheiden kann, ob ein
    Absacken eine Benachrichtigung wert ist — der Service selbst benachrichtigt nicht.
    """
    await require_couple_member(conn, couple_id, user_id)
    if not isinstance(value, int) or not MIN_VALUE <= value <= MAX_VALUE:
        raise HTTPException(status_code=400, detail="Bitte einen Wert zwischen 1 und 10.")

    vorher = await _latest(conn, couple_id, user_id)
    text = (note or "").strip()
    row = await conn.fetchrow(
        "INSERT INTO couple_barometer_readings (couple_id, user_id, value, note) "
        "VALUES ($1, $2, $3, $4) RETURNING *",
        couple_id, user_id, value,
        crypto.encrypt(text[:NOTE_MAX_CHARS]) if text else None,
    )
    neu = _decrypt(row)
    neu["previous_value"] = vorher["value"] if vorher else None
    return neu


async def load_state(conn, couple_id, user_id) -> dict[str, Any]:
    """Beide Regler nebeneinander — plus der eigene Verlauf.

    Der Verlauf der anderen Person kommt bewusst **nicht** mit: Der aktuelle Stand ist ein
    Signal zum Hinsehen; eine Chronik ihrer schlechten Tage wäre Material für Vorhaltungen.
    """
    link = await require_couple_member(conn, couple_id, user_id)
    names = await load_member_names(conn, link)
    partner_id = partner_of(link, user_id)

    eigen = await _latest(conn, couple_id, user_id)
    fremd = await _latest(conn, couple_id, partner_id) if partner_id else None

    def sicht(eintrag: dict | None, uid, ist_eigen: bool) -> dict:
        return {
            "user_id": str(uid) if uid else None,
            "name": ("Du" if ist_eigen else names.get(str(uid)) or "Partnerperson"),
            "is_own": ist_eigen,
            "value": eintrag["value"] if eintrag else None,
            "label": label_for(eintrag["value"]) if eintrag else None,
            "note": eintrag.get("note") if eintrag else None,
            "updated_at": eintrag["created_at"] if eintrag else None,
        }

    eintraege = [sicht(eigen, user_id, True)]
    if partner_id:
        eintraege.append(sicht(fremd, partner_id, False))

    return {
        "entries": eintraege,
        "own_history": await load_history(conn, couple_id, user_id),
        "levels": {str(k): v for k, v in LEVEL_LABELS.items()},
        "note_max_chars": NOTE_MAX_CHARS,
    }


async def load_history(conn, couple_id, user_id, limit: int = 30) -> list[dict]:
    """Der eigene Verlauf, älteste zuerst — Grundlage für die Linie im Frontend."""
    rows = await conn.fetch(
        "SELECT value, created_at FROM couple_barometer_readings "
        "WHERE couple_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT $3",
        couple_id, user_id, limit,
    )
    return [{"value": r["value"], "created_at": r["created_at"]} for r in reversed(rows)]

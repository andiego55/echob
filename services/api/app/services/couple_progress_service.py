"""Paartherapie: Punkte, Meilensteine und Fortschritt.

**Kooperativ statt kompetitiv.** Es gibt eigene Punkte je Person und gemeinsame Punkte des
Paares — aber keine Rangliste, keinen Gewinner und keine Bewertung, wer „mehr tut". Belohnt
wird Beteiligung; am meisten zählt das Einhalten einer Abmachung, nicht das Vielreden.

Diese Schicht **hört nur zu**: ``award`` wird aus den bestehenden Endpunkten aufgerufen und
schluckt Fehler bewusst (``best_effort``) — ein Problem beim Punktezählen darf niemals eine
Sitzung, eine Mediation oder eine Abmachung scheitern lassen.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.logging import get_logger
from app.services.couple_session_service import load_member_names
from app.services.couple_therapy_service import require_couple_member

logger = get_logger(__name__)

# Ereignis → (Punkte, Beschriftung). Einhalten schlägt Ankündigen.
POINTS: dict[str, tuple[int, str]] = {
    "context_shared":      (10, "Kontext für eine Sitzung freigegeben"),
    "session_started":     (15, "Ein Gespräch begonnen"),
    "session_summarized":  (20, "Ein Gespräch zusammengefasst"),
    "perspective_shared":  (10, "Sicht zu einem Thema geteilt"),
    "mediation_done":      (25, "Eine Mediation erarbeitet"),
    "test_taken":          (15, "Einen Test ausgefüllt"),
    "test_compared":       (20, "Ergebnisse verglichen"),
    "agreement_proposed":  (10, "Eine Abmachung vorgeschlagen"),
    "agreement_accepted":  (15, "Einer Abmachung zugestimmt"),
    "agreement_kept":      (30, "Eine Abmachung eingehalten"),
    "self_feedback":       (10, "Auf den eigenen Anteil geschaut"),
}


async def award(conn, couple_id, user_id, kind: str, ref_id=None) -> None:
    """Verbucht ein Ereignis — idempotent je (Paar, Person, Art, Bezug).

    Bewusst ohne Rückgabe und ohne Fehlerweitergabe: Punkte sind Beiwerk, nie ein Grund,
    eine echte Handlung scheitern zu lassen.
    """
    entry = POINTS.get(kind)
    if not entry:
        return
    try:
        await conn.execute(
            "INSERT INTO couple_point_events (couple_id, user_id, kind, points, ref_id) "
            "VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
            couple_id, user_id, kind, entry[0], str(ref_id) if ref_id is not None else None,
        )
    except Exception:  # noqa: BLE001 - Punktezählung darf nichts kaputt machen
        logger.warning("Punkte-Ereignis '%s' konnte nicht gespeichert werden.", kind)


async def load_progress(conn, couple_id, user_id) -> dict[str, Any]:
    """Fortschritt des Paarraums: eigene + gemeinsame Punkte, Streak, Meilensteine, Verlauf."""
    link = await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_point_events WHERE couple_id = $1 ORDER BY created_at DESC",
        couple_id,
    )
    events = [dict(r) for r in rows]
    names = await load_member_names(conn, link)

    per_person: dict[str, int] = {uid: 0 for uid in names}
    counts: dict[str, int] = {}
    for e in events:
        uid = str(e["user_id"])
        per_person[uid] = per_person.get(uid, 0) + e["points"]
        counts[e["kind"]] = counts.get(e["kind"], 0) + 1

    total = sum(per_person.values())
    streak = _streak_weeks(events)

    return {
        "total_points": total,
        "own_points": per_person.get(str(user_id), 0),
        "members": [
            {"user_id": uid, "name": name, "points": per_person.get(uid, 0)}
            for uid, name in names.items()
        ],
        "streak_weeks": streak,
        "level": _level(total),
        "milestones": _milestones(counts, total, streak),
        "recent": [
            {
                "kind": e["kind"],
                "label": POINTS.get(e["kind"], (0, e["kind"]))[1],
                "points": e["points"],
                "name": names.get(str(e["user_id"]), "Person"),
                "created_at": e["created_at"],
            }
            for e in events[:15]
        ],
    }


def _streak_weeks(events: list[dict]) -> int:
    """Wochen in Folge (inkl. dieser oder letzter) mit mindestens einer Aktivität."""
    if not events:
        return 0
    weeks = {(e["created_at"].isocalendar().year, e["created_at"].isocalendar().week)
             for e in events}
    now = datetime.now(UTC)
    # Läuft die Serie noch? Diese Woche zählt, sonst darf die letzte den Anfang machen.
    cursor = now
    if (now.isocalendar().year, now.isocalendar().week) not in weeks:
        cursor = now - timedelta(weeks=1)
        if (cursor.isocalendar().year, cursor.isocalendar().week) not in weeks:
            return 0
    streak = 0
    while (cursor.isocalendar().year, cursor.isocalendar().week) in weeks:
        streak += 1
        cursor -= timedelta(weeks=1)
    return streak


def _level(total: int) -> dict[str, Any]:
    """Sanfte Stufen — Wegmarken, keine Bewertung der Beziehung."""
    stufen = [
        (0, "Angekommen"), (60, "In Bewegung"), (150, "Eingespielt"),
        (300, "Verlässlich"), (600, "Eingeübt"),
    ]
    name, nxt = stufen[0][1], None
    for i, (schwelle, label) in enumerate(stufen):
        if total >= schwelle:
            name = label
            nxt = stufen[i + 1] if i + 1 < len(stufen) else None
    return {
        "name": name,
        "next_at": nxt[0] if nxt else None,
        "next_name": nxt[1] if nxt else None,
    }


def _milestones(counts: dict[str, int], total: int, streak: int) -> list[dict[str, Any]]:
    """Abgeleitet aus den Ereignissen — keine zweite Wahrheit in der DB."""
    defs = [
        ("erster_schritt",  "Erster Schritt",      "Ihr habt gemeinsam angefangen.",
         sum(counts.values()) > 0),
        ("erstes_gespraech", "Erstes Gespräch",    "Ihr habt ein moderiertes Gespräch geführt.",
         counts.get("session_started", 0) > 0),
        ("erste_abmachung", "Erste Abmachung",     "Ihr habt euch auf etwas geeinigt.",
         counts.get("agreement_accepted", 0) > 0),
        ("wort_gehalten",   "Wort gehalten",       "Eine Abmachung hat gehalten.",
         counts.get("agreement_kept", 0) > 0),
        ("dreimal_gehalten", "Verlässlich",        "Drei Abmachungen haben gehalten.",
         counts.get("agreement_kept", 0) >= 3),
        ("erste_mediation", "Erste Mediation",     "Ihr habt ein festgefahrenes Thema angegangen.",
         counts.get("mediation_done", 0) > 0),
        ("beide_getestet",  "Nebeneinandergelegt", "Ihr habt Testergebnisse verglichen.",
         counts.get("test_compared", 0) > 0),
        ("dranbleiber",     "Dranbleiber",         "Drei Wochen in Folge aktiv.", streak >= 3),
        ("hundert",         "100 Punkte",          "Gemeinsam 100 Punkte gesammelt.", total >= 100),
        ("dreihundert",     "300 Punkte",          "Gemeinsam 300 Punkte gesammelt.", total >= 300),
    ]
    return [
        {"key": k, "title": t, "description": d, "reached": bool(ok)}
        for k, t, d, ok in defs
    ]

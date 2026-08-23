"""Paartherapie: der Rückblick über Zeit.

Das Modul zeigt gut, **dass** ihr arbeitet — Punkte, Streak, Meilensteine. Es zeigt
nirgends, **was sich verändert hat**. Genau das trägt aber über Monate: Ein Paar merkt
Fortschritt selten im Alltag, sondern erst im Vergleich.

**Die Zahlen liegen alle schon da.** Barometer, Check-ins, Sitzungen, Themen, Abmachungen,
Wertschätzungen. Dieser Service rechnet sie für einen Zeitraum zusammen und legt sie Echo
vor; gespeichert wird nur Echos Text, nicht die Statistik — die ist jederzeit neu ableitbar.

**Eine Regel zur Vertraulichkeit.** Beim Barometer gibt ``couple_barometer_service`` den
Verlauf der anderen Person bewusst nicht heraus: Eine Chronik ihrer schlechten Tage wäre
Material für Vorhaltungen. Der Rückblick hält sich daran — er rechnet mit **Durchschnitten
des Paares**, nie mit der Tageskurve der anderen Person. „Euer Schnitt ist von 5,4 auf 6,8
gestiegen" sagt etwas über euch; „am 12. stand sie auf 2" wäre eine Waffe.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from fastapi import HTTPException

from app.core import crypto
from app.services.couple_session_service import load_member_names
from app.services.couple_therapy_service import require_couple_member

#: Standard-Zeitraum eines Rückblicks.
DEFAULT_DAYS = 30
#: Kürzer lohnt sich nicht — dann gibt es nichts zu vergleichen.
MIN_DAYS = 14


def _round(wert: float | None) -> float | None:
    return round(float(wert), 1) if wert is not None else None


async def load_stats(conn, couple_id, user_id, days: int = DEFAULT_DAYS) -> dict[str, Any]:
    """Was in den letzten ``days`` Tagen passiert ist — und wie es davor aussah."""
    link = await require_couple_member(conn, couple_id, user_id)
    bis = date.today()
    von = bis - timedelta(days=days)
    davor = von - timedelta(days=days)

    async def zahl(sql: str, *args) -> int:
        return await conn.fetchval(sql, *args) or 0

    # ── Barometer: Durchschnitt des Paares, nicht die Kurve der anderen Person ──
    async def schnitt(ab: date, bis_: date) -> float | None:
        return await conn.fetchval(
            "SELECT AVG(value) FROM couple_barometer_readings "
            "WHERE couple_id = $1 AND created_at >= $2 AND created_at < $3",
            couple_id, ab, bis_,
        )

    jetzt_schnitt = _round(await schnitt(von, bis + timedelta(days=1)))
    vorher_schnitt = _round(await schnitt(davor, von))

    # ── Check-ins ────────────────────────────────────────────────────────────
    wochen = await zahl(
        "SELECT COUNT(DISTINCT week_start) FROM couple_checkins "
        "WHERE couple_id = $1 AND week_start >= $2", couple_id, von)
    stimmungen = [
        {"mood": r["mood"], "anzahl": r["n"]}
        for r in await conn.fetch(
            # Seit Migration 92 sind es mehrere je Woche. `COALESCE` holt
            # Bestandszeilen mit, die nur die alte Einzelspalte haben.
            "SELECT m AS mood, COUNT(*) AS n FROM couple_checkins, "
            "  LATERAL unnest(COALESCE(moods, ARRAY[mood])) AS m "
            "WHERE couple_id = $1 AND week_start >= $2 AND m IS NOT NULL "
            "GROUP BY m ORDER BY n DESC, m", couple_id, von)
    ]

    # ── Gespräche, Themen, Abmachungen, Wertschätzung ────────────────────────
    stats = {
        "sessions_started": await zahl(
            "SELECT COUNT(*) FROM couple_sessions WHERE couple_id = $1 "
            "AND created_at >= $2 AND status <> 'draft'", couple_id, von),
        "sessions_closed": await zahl(
            "SELECT COUNT(*) FROM couple_sessions WHERE couple_id = $1 "
            "AND closed_at >= $2", couple_id, von),
        "topics_opened": await zahl(
            "SELECT COUNT(*) FROM couple_topics WHERE couple_id = $1 AND created_at >= $2",
            couple_id, von),
        "topics_resolved": await zahl(
            "SELECT COUNT(*) FROM couple_topics WHERE couple_id = $1 "
            "AND status = 'resolved' AND updated_at >= $2", couple_id, von),
        "agreements_made": await zahl(
            "SELECT COUNT(*) FROM couple_agreements WHERE couple_id = $1 "
            "AND accepted_at >= $2", couple_id, von),
        "agreements_kept": await zahl(
            "SELECT COUNT(*) FROM couple_agreements WHERE couple_id = $1 "
            "AND status = 'kept' AND updated_at >= $2", couple_id, von),
        "agreements_dropped": await zahl(
            "SELECT COUNT(*) FROM couple_agreements WHERE couple_id = $1 "
            "AND status = 'dropped' AND updated_at >= $2", couple_id, von),
        "appreciations": await zahl(
            "SELECT COUNT(*) FROM couple_appreciations WHERE couple_id = $1 "
            "AND created_at >= $2", couple_id, von),
        "checkin_weeks": wochen,
    }

    return {
        "period_start": von,
        "period_end": bis,
        "days": days,
        "barometer_avg": jetzt_schnitt,
        "barometer_avg_before": vorher_schnitt,
        "barometer_delta": (
            _round(jetzt_schnitt - vorher_schnitt)
            if jetzt_schnitt is not None and vorher_schnitt is not None else None
        ),
        "moods": stimmungen,
        "names": await load_member_names(conn, link),
        **stats,
    }


def has_substance(stats: dict[str, Any]) -> bool:
    """Lohnt sich ein Rückblick überhaupt schon?

    Ein Text über einen leeren Zeitraum wäre schlimmer als keiner — er würde so tun, als
    gäbe es etwas zu sehen, und damit den Rückblick als Format entwerten.
    """
    return any((
        stats["sessions_started"], stats["topics_opened"], stats["agreements_made"],
        stats["appreciations"], stats["checkin_weeks"],
        stats["barometer_avg"] is not None,
    ))


def build_input(stats: dict[str, Any]) -> str:
    """Die Zahlen als Text für Echo. Nur Aggregate, keine Beiträge, keine Namen von Dritten."""
    n = list(stats["names"].values())
    zeilen = [
        f"Zeitraum: {stats['period_start']:%d.%m.%Y} bis {stats['period_end']:%d.%m.%Y} "
        f"({stats['days']} Tage).",
        f"Der Paarraum gehört {' und '.join(n) if n else 'zwei Personen'}.",
        "",
    ]

    if stats["barometer_avg"] is not None:
        zeile = f"Stimmungsbarometer (Schnitt beider, 1-10): {stats['barometer_avg']}"
        if stats["barometer_delta"] is not None:
            richtung = (
                "gestiegen" if stats["barometer_delta"] > 0
                else "gefallen" if stats["barometer_delta"] < 0 else "unverändert"
            )
            zeile += (f" — im Zeitraum davor {stats['barometer_avg_before']}, "
                      f"also {richtung} um {abs(stats['barometer_delta'])}")
        zeilen.append(zeile + ".")

    if stats["moods"]:
        verteilung = ", ".join(f"{m['mood']} ({m['anzahl']}x)" for m in stats["moods"])
        zeilen.append(f"Stimmungen in den Check-ins: {verteilung}.")

    zeilen += [
        f"Wochen mit Check-in: {stats['checkin_weeks']}.",
        f"Begonnene Gespräche: {stats['sessions_started']}, "
        f"davon abgeschlossen: {stats['sessions_closed']}.",
        f"Themen in Mediation: {stats['topics_opened']} neu, "
        f"{stats['topics_resolved']} geklärt.",
        f"Abmachungen: {stats['agreements_made']} vereinbart, "
        f"{stats['agreements_kept']} gehalten, {stats['agreements_dropped']} verworfen.",
        f"Wertschätzungen füreinander: {stats['appreciations']}.",
    ]
    return "\n".join(zeilen)


# ── Speichern und Wiederfinden ───────────────────────────────────────────────


def _decrypt(row: dict) -> dict:
    return crypto.decrypt_fields(dict(row), "body")


async def save(conn, couple_id, user_id, *, body: str, period_start, period_end) -> dict:
    await require_couple_member(conn, couple_id, user_id)
    row = await conn.fetchrow(
        "INSERT INTO couple_retrospectives "
        "(couple_id, created_by, period_start, period_end, body) "
        "VALUES ($1, $2, $3, $4, $5) RETURNING *",
        couple_id, user_id, period_start, period_end, crypto.encrypt(body),
    )
    return _decrypt(row)


async def list_all(conn, couple_id, user_id, limit: int = 12) -> list[dict]:
    """Alle Rückblicke des Paarraums, neueste zuerst — beide sehen sie."""
    await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_retrospectives WHERE couple_id = $1 "
        "ORDER BY created_at DESC LIMIT $2",
        couple_id, limit,
    )
    return [_decrypt(r) for r in rows]


async def delete(conn, retro_id, user_id) -> bool:
    """Löschen darf jede Person im Raum — er gehört beiden."""
    row = await conn.fetchrow(
        "SELECT couple_id FROM couple_retrospectives WHERE id = $1", retro_id)
    if not row:
        raise HTTPException(status_code=404, detail="Rückblick nicht gefunden.")
    await require_couple_member(conn, row["couple_id"], user_id)
    await conn.execute("DELETE FROM couple_retrospectives WHERE id = $1", retro_id)
    return True

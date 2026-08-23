"""Paartherapie: der woechentliche Check-in.

**Warum.** Alles andere im Paarraum braucht einen Anlass - ein Thema, einen Streit, einen
Vorschlag. Ohne einen festen, kleinen Termin bleibt das Modul etwas, das man einmal
ausprobiert. Der Check-in ist die Gegenbewegung: fuenf Minuten, drei Fragen, jede Woche.

**Drei Fragen.** Wie war die Woche fuer dich (Stimmung)? Was war schoen (Hoehepunkt)? Was
wuenschst du dir fuer naechste Woche? Die dritte ist die wichtigste - aus Wuenschen werden
Abmachungen.

**Reihenfolge wie ueberall im Modul:** Erst schreiben, dann die Antwort der anderen Person
sehen. Nicht als Pruefung, sondern damit die eigene Sicht die eigene bleibt.

**Trennung:** eigene Tabelle ``couple_checkins``, kein Zugriff auf Fall-Daten, alles ueber
``require_couple_member``.
"""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import HTTPException

from app.core import crypto
from app.services.couple_session_service import MOOD_LABELS, load_member_names
from app.services.couple_therapy_service import require_couple_member

# Die drei Fragen - hier, damit Frontend und Echo denselben Wortlaut sehen.
QUESTIONS: dict[str, str] = {
    "mood": "Wie war die Woche fuer dich?",
    "highlight": "Was war schoen? Ein Moment, der dir geblieben ist.",
    "wish": "Was wuenschst du dir fuer naechste Woche?",
}

MAX_CHARS = 600


def week_start(tag: date | None = None) -> date:
    """Der Montag der Woche - macht 'eine Antwort je Person und Woche' erzwingbar."""
    tag = tag or date.today()
    return tag - timedelta(days=tag.weekday())


def _decrypt(row: dict) -> dict:
    d = crypto.decrypt_fields(dict(row), "highlight", "wish")
    # Bestandszeilen haben nur `mood`. Nach aussen gibt es nur noch `moods`.
    if not d.get("moods"):
        d["moods"] = [d["mood"]] if d.get("mood") else []
    return d


async def save(conn, couple_id, user_id, *, moods=None, highlight=None, wish=None) -> dict:
    """Legt den eigenen Check-in der laufenden Woche an oder aktualisiert ihn.

    ``moods`` ist eine Liste — eine Woche ist selten nur eines. Doppelte werden
    entfernt, die Reihenfolge der Auswahl bleibt erhalten.

    Die alte Spalte ``mood`` wird als ERSTER Eintrag mitgeschrieben. Sie ist damit
    abgeleitet, nicht mehr die Wahrheit; sie existiert nur noch für Bestandszeilen
    und Leser, die sie noch erwarten (siehe Migration 92).
    """
    await require_couple_member(conn, couple_id, user_id)

    liste: list[str] | None = None
    if moods is not None:
        # Reihenfolge erhalten, Doppelte raus.
        liste = list(dict.fromkeys(m for m in moods if m))
        unbekannt = [m for m in liste if m not in MOOD_LABELS]
        if unbekannt:
            raise HTTPException(status_code=400, detail="Unbekannte Stimmungsangabe.")
        if len(liste) > len(MOOD_LABELS):
            raise HTTPException(status_code=400, detail="Zu viele Stimmungsangaben.")
        liste = liste or None

    woche = week_start()
    row = await conn.fetchrow(
        "INSERT INTO couple_checkins "
        "  (couple_id, user_id, week_start, moods, mood, highlight, wish) "
        "VALUES ($1, $2, $3, $4::text[], $5, $6, $7) "
        "ON CONFLICT (couple_id, user_id, week_start) DO UPDATE SET "
        "  moods = COALESCE(EXCLUDED.moods, couple_checkins.moods), "
        "  mood = COALESCE(EXCLUDED.mood, couple_checkins.mood), "
        "  highlight = COALESCE(EXCLUDED.highlight, couple_checkins.highlight), "
        "  wish = COALESCE(EXCLUDED.wish, couple_checkins.wish) "
        "RETURNING *",
        couple_id, user_id, woche, liste, (liste[0] if liste else None),
        crypto.encrypt((highlight or "").strip()[:MAX_CHARS]) if highlight else None,
        crypto.encrypt((wish or "").strip()[:MAX_CHARS]) if wish else None,
    )
    return _decrypt(row)


async def load_week(conn, couple_id, user_id, woche: date | None = None) -> dict:
    """Der Check-in der Woche - eigener immer, fremder erst nach dem eigenen.

    Das ``visible``-Feld sagt dem Frontend, warum etwas fehlt: noch nicht ausgefuellt
    (von ihr) oder noch verdeckt (weil du selbst noch nicht dran warst).
    """
    link = await require_couple_member(conn, couple_id, user_id)
    woche = woche or week_start()
    rows = await conn.fetch(
        "SELECT * FROM couple_checkins WHERE couple_id = $1 AND week_start = $2",
        couple_id, woche,
    )
    eintraege = {str(r["user_id"]): _decrypt(r) for r in rows}
    names = await load_member_names(conn, link)

    eigener = eintraege.get(str(user_id))
    fertig = bool(eigener and (eigener.get("highlight") or eigener.get("wish")
                               or eigener.get("moods")))

    ergebnis = []
    for uid, name in names.items():
        ist_eigen = str(uid) == str(user_id)
        eintrag = eintraege.get(str(uid))
        sichtbar = ist_eigen or fertig
        ergebnis.append({
            "user_id": str(uid),
            "name": name,
            "is_own": ist_eigen,
            "done": bool(eintrag),
            "moods": (eintrag.get("moods") or []) if (eintrag and sichtbar) else [],
            "highlight": eintrag.get("highlight") if (eintrag and sichtbar) else None,
            "wish": eintrag.get("wish") if (eintrag and sichtbar) else None,
            "visible": sichtbar,
        })

    return {
        "week_start": woche,
        "entries": sorted(ergebnis, key=lambda e: not e["is_own"]),
        "own_done": fertig,
        "both_done": len(eintraege) >= 2 and all(e["done"] for e in ergebnis),
        "questions": QUESTIONS,
        "moods": MOOD_LABELS,
    }


async def load_history(conn, couple_id, user_id, limit: int = 12) -> list[dict]:
    """Die letzten Wochen als Zeitstrahl - nur Stimmungen, kein Text.

    Bewusst reduziert: Der Rueckblick soll zeigen, DASS ihr drangeblieben seid, nicht
    alte Saetze wieder aufwaermen.
    """
    link = await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT week_start, user_id, COALESCE(moods, ARRAY[mood]) AS moods "
        "FROM couple_checkins "
        "WHERE couple_id = $1 ORDER BY week_start DESC LIMIT $2",
        couple_id, limit * 2,
    )
    names = await load_member_names(conn, link)
    wochen: dict[date, dict] = {}
    for r in rows:
        w = wochen.setdefault(r["week_start"], {"week_start": r["week_start"], "moods": []})
        w["moods"].append({
            "user_id": str(r["user_id"]),
            "name": names.get(str(r["user_id"])) or names.get(r["user_id"]) or "",
            "moods": [m for m in (r["moods"] or []) if m],
            "is_own": str(r["user_id"]) == str(user_id),
        })
    return sorted(wochen.values(), key=lambda w: w["week_start"], reverse=True)[:limit]

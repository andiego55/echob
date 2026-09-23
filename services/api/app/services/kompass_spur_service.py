"""Deine Spur — alles Festgehaltene auf einer Zeitachse.

**Der Ort, an dem die beiden Hälften des Produkts sichtbar eine werden.** Der Bauplan
sagt es so: „die Beziehungsarbeit und die Arbeit an sich selbst auf derselben Linie. Wer
hier zurückscrollt, sieht nicht Daten, sondern ein Jahr." Pulse, bestätigte Sätze,
Vorhaben und ihre Schritte, Porträts — und, **einblendbar**, die Szenen aus den Fällen.

**Keine neue Tabelle, keine neue Abfrage.** Dieser Dienst besitzt nichts; er ruft die
Listen der Grundformen ab, die es schon gibt, und legt sie auf eine Achse. Das ist nicht
nur weniger Code: Jede dieser Listen bindet die Nutzer-Kennung bereits selbst und ist
dafür geprüft. Eigenes SQL hier hieße, dieselbe Eigentumsfrage ein sechstes Mal zu
beantworten — und eine davon falsch zu beantworten genügt.

**Szenen sind nicht voreingestellt.** Sie gehören zu Fällen, und der Kompass ist der Raum
ohne Fall. Wer sie sehen will, blendet sie ein; wer nur auf sich schauen will, wird nicht
an eine Beziehung erinnert.

**Zwei Seiten, ein Dienst.** Dieselbe Funktion trägt die Zeitachse und die Belege unter
einem Vorhaben („Seit dem 3. März hast du festgehalten: …"). Der Bauplan verlangt dort
ausdrücklich Spuren statt eines Fortschrittsbalkens — und Spuren sind genau das hier,
nur mit einem späteren Anfang.

**Was dieser Dienst nicht tut: deuten.** Er sagt nicht, dass vier Pulse *für* ein
Vorhaben sprechen. Er sagt, was seitdem da ist. Der Unterschied ist derselbe wie zwischen
einem Beleg und einer Behauptung — und ein Balken bei 40 % wäre die Behauptung.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import asyncpg

from app.core import crypto
from app.core.logging import get_logger
from app.services import (
    kompass_portrait_service,
    kompass_saetze_service,
    kompass_service,
    kompass_vorhaben_service,
)

logger = get_logger(__name__)

#: Voreinstellung des Zeitraums. Zwölf Wochen: lang genug, dass sich etwas zeigt, kurz
#: genug, dass die Seite beim ersten Öffnen nicht endlos ist.
SPUR_TAGE = 84

#: Obergrenze der Ereignisse je Abruf. Wer ein Jahr aufklappt, bekommt nicht alles auf
#: einmal — eine Seite mit dreitausend Punkten liest niemand, und sie lädt auch niemand.
MAX_EREIGNISSE = 400

#: Wie viel Text je Ereignis mitkommt. Die Zeitachse ist eine Übersicht; wer mehr will,
#: geht auf die Seite der Form. Ganze Tagebucheinträge hier zu wiederholen machte aus der
#: Linie eine zweite, schlechtere Verlaufsliste.
VORSCHAU_ZEICHEN = 160

#: Die Arten, die auf der Achse liegen können. Der Reihe nach, wie sie im Bauplan stehen.
ARTEN = ("puls", "satz", "vorhaben", "schritt", "portrait", "szene")


def _kuerzen(text: str | None) -> str | None:
    sauber = (text or "").strip()
    if not sauber:
        return None
    if len(sauber) <= VORSCHAU_ZEICHEN:
        return sauber
    return sauber[:VORSCHAU_ZEICHEN].rstrip() + "…"


def _zeit(wert: Any) -> datetime | None:
    """Ein Zeitpunkt aus der Datenbank oder aus einem JSON-Feld.

    Die Schritte eines Vorhabens tragen ihr ``erledigt_at`` als Zeichenkette im JSON —
    dort gibt es keinen Zeitstempel-Typ. Ohne diese Zeile fiele jeder abgehakte Schritt
    still von der Achse: kein Fehler, nur ein fehlender Haken.
    """
    if isinstance(wert, datetime):
        return wert if wert.tzinfo else wert.replace(tzinfo=UTC)
    if isinstance(wert, str) and wert.strip():
        try:
            gelesen = datetime.fromisoformat(wert.replace("Z", "+00:00"))
        except ValueError:
            return None
        return gelesen if gelesen.tzinfo else gelesen.replace(tzinfo=UTC)
    return None


async def ereignisse(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    von: datetime | None = None,
    tage: int = SPUR_TAGE,
    mit_szenen: bool = False,
    grenze: int = MAX_EREIGNISSE,
) -> list[dict[str, Any]]:
    """Alles Festgehaltene seit ``von``, neueste zuerst.

    ``von`` schlägt ``tage``: Die Zeitachse rechnet mit Tagen, die Belege unter einem
    Vorhaben mit dem Tag, an dem es angefangen hat.

    Neueste zuerst, anders als bei der Kurve (die älteste zuerst liefert, weil man eine
    Linie von links liest). Eine Zeitachse liest man von jetzt nach hinten.
    """
    seit = von or (datetime.now(UTC) - timedelta(days=max(1, tage)))
    gesammelt: list[dict[str, Any]] = []

    # ── Pulse ────────────────────────────────────────────────────────────────
    spanne = max(1, (datetime.now(UTC) - seit).days + 1)
    for p in await kompass_service.verlauf(conn, user_id=user_id, tage=spanne):
        am = _zeit(p.get("created_at"))
        if am is None or am < seit:
            continue
        gesammelt.append({
            "art": "puls",
            "am": am,
            "titel": p.get("zustand_label") or "Ein Moment",
            "detail": _kuerzen(p.get("notiz")),
            "zustand": p.get("zustand"),
            "ziel": "/app/kompass/verlauf",
        })

    # ── Bestätigte Sätze ─────────────────────────────────────────────────────
    for s in await kompass_saetze_service.liste(
        conn, user_id=user_id, staende=("bestaetigt",)
    ):
        # Das Datum der ZUSTIMMUNG, nicht das der Anlage: Ein Satz, den Echo im Januar
        # vorgeschlagen und die Person im Maerz bestaetigt hat, gehoert in den Maerz.
        am = _zeit(s.get("bestaetigt_at"))
        if am is None or am < seit:
            continue
        gesammelt.append({
            "art": "satz",
            "am": am,
            "titel": s.get("art_label") or s.get("art") or "Ein Satz über mich",
            "detail": _kuerzen(s.get("text")),
            "zustand": None,
            "ziel": "/app/kompass/saetze",
        })

    # ── Vorhaben und ihre Schritte ───────────────────────────────────────────
    for v in await kompass_vorhaben_service.liste(conn, user_id=user_id):
        angefangen = _zeit(v.get("created_at"))
        if angefangen is not None and angefangen >= seit:
            gesammelt.append({
                "art": "vorhaben",
                "am": angefangen,
                "titel": "Vorgenommen",
                "detail": _kuerzen(v.get("titel")),
                "zustand": None,
                "ziel": "/app/kompass/vorhaben",
            })
        for schritt in v.get("schritte") or []:
            erledigt = _zeit(schritt.get("erledigt_at"))
            if erledigt is None or erledigt < seit:
                continue
            gesammelt.append({
                "art": "schritt",
                "am": erledigt,
                "titel": "Schritt getan",
                "detail": _kuerzen(schritt.get("text")),
                "zustand": None,
                "ziel": "/app/kompass/vorhaben",
            })

    # ── Porträts ─────────────────────────────────────────────────────────────
    for p in await kompass_portrait_service.verlauf(conn, user_id=user_id):
        am = _zeit(p.get("bestaetigt_at"))
        if am is None or am < seit:
            continue
        gesammelt.append({
            "art": "portrait",
            "am": am,
            "titel": "Selbstporträt",
            "detail": _kuerzen(p.get("text")),
            "zustand": None,
            "ziel": "/app/kompass/portrait",
        })

    # ── Szenen, nur auf Wunsch ───────────────────────────────────────────────
    if mit_szenen:
        gesammelt.extend(await _szenen(conn, user_id=user_id, seit=seit))

    gesammelt.sort(key=lambda e: e["am"], reverse=True)
    return gesammelt[: max(0, grenze)]


async def _szenen(
    conn: asyncpg.Connection, *, user_id: UUID | str, seit: datetime
) -> list[dict[str, Any]]:
    """Die eigenen Szenen als Punkte auf der Achse — Titel, kein Inhalt.

    **Die Abfrage bindet ``user_id`` selbst**, obwohl Szenen über den Fall zur Person
    gehören: Sonst stünde die Eigentümerschaft auf einem Verweis statt auf einer
    Bedingung. Dieselbe Entscheidung wie bei Echos Vorschlägen.

    Die Beschreibung bleibt draußen, und das ist keine Sparsamkeit: Sie liegt
    feldverschlüsselt, und sie ist der ausführliche Teil. Was eine Zeitachse braucht, ist
    ein Titel und ein Datum — der Rest steht in der Szene.
    """
    zeilen = await conn.fetch(
        "SELECT id, case_id, title, scene_date, created_at FROM scenes "
        "WHERE user_id = $1 AND created_at >= $2 "
        "ORDER BY created_at DESC LIMIT $3",
        user_id, seit, MAX_EREIGNISSE,
    )
    ereignis = []
    for z in zeilen:
        # Titel sind unverschluesselt - aber ein decrypt auf Klartext gibt ihn
        # unveraendert zurueck, und die Annahme "unverschluesselt" ist nichts, worauf
        # eine Anzeige beruhen sollte. Kostet nichts und faellt nicht um.
        titel = crypto.decrypt(z["title"]) if z["title"] else ""
        ereignis.append({
            "art": "szene",
            "am": _zeit(z["created_at"]),
            "titel": "Szene",
            "detail": _kuerzen(titel) or "Ohne Titel",
            "zustand": None,
            "ziel": f"/app/cases/{z['case_id']}/scenes/{z['id']}",
        })
    return [e for e in ereignis if e["am"] is not None]


async def belege_fuer_vorhaben(
    conn: asyncpg.Connection, *, user_id: UUID | str, vorhaben_id: UUID | str
) -> dict[str, Any] | None:
    """Was seit dem Anfang eines Vorhabens dazugekommen ist.

    **Belege statt Fortschrittsbalken.** „Ein Balken bei 40 % wäre erfunden. Vier Pulse
    und eine Szene sind wahr — und sie überzeugen mehr, weil man sie nachlesen kann."

    Was hier NICHT behauptet wird: dass diese Pulse und Szenen von diesem Vorhaben
    handeln. Das wüsste nur ein Modell, und es wüsste es nicht sicher. Es steht da, was
    seit jenem Tag festgehalten wurde — die Person liest selbst, ob es zusammengehört.
    Eine Zahl, die Zugehörigkeit behauptet, wäre der Balken in anderer Form.
    """
    # Ueber die Liste und nicht ueber eine eigene Abfrage: Ein Mensch hat eine Handvoll
    # Vorhaben, das kostet nichts - und eine neue Abfrage waere eine sechste Stelle, an
    # der die Eigentuemerschaft richtig gebunden sein muss. Die Liste tut das bereits.
    alle_vorhaben = await kompass_vorhaben_service.liste(conn, user_id=user_id)
    vorhaben = next(
        (v for v in alle_vorhaben if str(v["id"]) == str(vorhaben_id)), None)
    if vorhaben is None:
        return None

    seit = _zeit(vorhaben.get("created_at"))
    if seit is None:
        return None

    alle = await ereignisse(
        conn, user_id=user_id, von=seit, mit_szenen=True, grenze=MAX_EREIGNISSE)
    # Das Vorhaben selbst und seine eigenen Schritte zaehlen nicht als Spur: Der Haken an
    # einem Schritt ist genau das Abhaken, das der Balken gemessen hat.
    spuren = [e for e in alle if e["art"] in ("puls", "satz", "szene", "portrait")]

    zaehlung: dict[str, int] = {}
    for e in spuren:
        zaehlung[e["art"]] = zaehlung.get(e["art"], 0) + 1

    return {
        "seit": seit,
        "zaehlung": zaehlung,
        "ereignisse": spuren[:12],
    }


__all__ = [
    "ARTEN",
    "MAX_EREIGNISSE",
    "SPUR_TAGE",
    "belege_fuer_vorhaben",
    "ereignisse",
]

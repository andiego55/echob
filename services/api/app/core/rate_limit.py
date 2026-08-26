"""Anfragebegrenzung — gegen Missbrauch, nicht gegen Nutzer.

**Was es hier NICHT gibt: ein zweites Limit auf die teuren KI-Wege.** Die sind bereits
fachlich gedeckelt (Echo-Prompts gesamt und pro Tag, KI-Nutzung pro Monat, Testphase). Ein
technisches Limit daneben würde nur echte Menschen ausbremsen — womöglich jemanden, der
gerade in einer Krise schreibt. Das wäre der teuerste denkbare Fehlalarm.

**Wovor es schützt.** Drei Dinge, bei denen es keinen Nutzer gibt, den man bremsen könnte:

* ``/contact``      Formular-Spam. Ein Mensch schickt eine Anfrage, keine fünfzig.
* ``/pseudonymous`` Kontoerstellung im Massenbetrieb.
* ``/directory``    Abgriff des öffentlichen Fachpersonenverzeichnisses.

Und viertens, für alles Übrige, eine Obergrenze so hoch, dass sie niemand von Hand
erreicht: Sie fängt eine Schleife im Frontend oder ein hängendes Skript ab, nicht Menschen.
Zur Einordnung: Der Paarraum fragt alle 20 Sekunden nach, „Ehrlich mitteilen" alle 15 — ein
aktiver Mensch mit drei offenen Reitern kommt auf etwa 20 Anfragen pro Minute.

**Anmeldung läuft über Supabase, nicht über uns.** Deshalb steht hier keine Regel gegen
Passwort-Raten: Diese Endpunkte gibt es im Backend gar nicht.

**Warum im Arbeitsspeicher und nicht in Postgres oder Redis.** Postgres hieße eine Abfrage
je Anfrage — ausgerechnet auf der Ressource, die wir schonen wollen. Redis hieße ein
weiterer Dienst, den jemand betreiben, sichern und aktualisieren muss. Bei zwei
Arbeitsprozessen zählt jeder für sich, das effektive Limit ist also doppelt so hoch wie
eingestellt. Bei großzügigen Grenzen ist das bedeutungslos: Wir wollen die Größenordnung
treffen, nicht die Zahl.
"""
from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class Regel:
    """Ein Pfad-Präfix und was darauf erlaubt ist. Die erste passende Regel gilt."""

    praefix: str
    anfragen: int
    fenster: int
    grund: str


#: Reihenfolge ist bedeutsam: Die erste passende Regel gewinnt, das leere Präfix fängt alles
#: Übrige. Neue Regeln gehören VOR den Auffangeintrag.
REGELN: tuple[Regel, ...] = (
    Regel("/api/v1/contact", 10, 60,
          "Lead-Formular: Ein Mensch schickt eine Anfrage, kein Skript fuenfzig."),
    Regel("/api/v1/pseudonymous", 10, 60,
          "Kontoerstellung - im Massenbetrieb waere es Missbrauch."),
    Regel("/api/v1/directory", 60, 60,
          "Oeffentliches Verzeichnis: Blaettern ja, systematischer Abgriff nein."),
    Regel("", 300, 60,
          "Auffangnetz gegen Schleifen im Frontend. Von Hand nicht erreichbar."),
)

#: Nie begrenzt: Die Gesundheitspruefung kommt aus dem Container selbst und vom Waechter.
#: Sie ausgerechnet dann abzuweisen, wenn viel los ist, hiesse Alarm bei Betriebsamkeit.
NIE_BEGRENZEN = ("/api/v1/health",)

#: Obergrenze fuer die Zaehlertabelle. Ohne sie waechst sie mit jeder neuen Adresse
#: unbegrenzt - ein Angreifer mit wechselnden Adressen haette sonst einen Weg in den
#: Speicher statt in die Datenbank.
MAX_SCHLUESSEL = 20_000


class Fenster:
    """Fester Zeitraum je Schlüssel. Kein gleitendes Fenster.

    Ein gleitendes Fenster wäre genauer, bräuchte aber je Schlüssel eine Liste von
    Zeitstempeln statt einer Zahl. Der Preis der einfachen Variante: An der Fenstergrenze
    sind kurzzeitig bis zu zwei Kontingente möglich. Bei 300 Anfragen pro Minute ist das
    belanglos — bei 10 auf dem Kontaktformular ebenfalls, denn 20 Formulare in zwei
    Sekunden bleiben ein Vielfaches unter dem, was Spam ausmacht.
    """

    def __init__(self) -> None:
        self._zaehler: dict[tuple[str, str], tuple[int, float]] = {}

    def zaehle(self, schluessel: str, regel: Regel, jetzt: float) -> tuple[bool, int]:
        """(erlaubt, Sekunden bis zum nächsten Versuch)."""
        beginn = jetzt - (jetzt % regel.fenster)
        k = (schluessel, regel.praefix)
        anzahl, gestartet = self._zaehler.get(k, (0, beginn))

        if gestartet < beginn:            # neues Fenster
            anzahl, gestartet = 0, beginn

        if anzahl >= regel.anfragen:
            return False, int(gestartet + regel.fenster - jetzt) + 1

        self._zaehler[k] = (anzahl + 1, gestartet)
        if len(self._zaehler) > MAX_SCHLUESSEL:
            self._aufraeumen(jetzt)
        return True, 0

    def _aufraeumen(self, jetzt: float) -> None:
        """Abgelaufene Einträge wegwerfen; hilft das nicht, alles."""
        vorher = len(self._zaehler)
        self._zaehler = {
            k: v for k, v in self._zaehler.items() if v[1] > jetzt - 300
        }
        if len(self._zaehler) > MAX_SCHLUESSEL:
            # Lieber alle Zähler verlieren als den Speicher: Ein zurückgesetztes Fenster
            # kostet einen Moment Nachsicht, ein volles Gedächtnis kostet den Dienst.
            self._zaehler.clear()
        logger.warning(
            "Zaehlertabelle aufgeraeumt: %d -> %d Eintraege.", vorher, len(self._zaehler)
        )


_fenster = Fenster()


def _regel_fuer(pfad: str) -> Regel:
    for regel in REGELN:
        if pfad.startswith(regel.praefix):
            return regel
    return REGELN[-1]


def _schluessel(request: Request) -> str:
    """Wer fragt — angemeldet je Person, sonst je Adresse.

    Für Angemeldete wird das Anmelde-Merkmal gehasht statt die Adresse genommen: Sonst
    teilen sich alle hinter demselben Anschluss ein Kontingent — ein Paar zu Hause, ein
    Institut, ein Mobilfunknetz. Genau die Menschen also, die wir keinesfalls bremsen wollen.
    """
    kopf = request.headers.get("authorization", "")
    if kopf:
        return "u:" + hashlib.sha256(kopf.encode()).hexdigest()[:32]
    return "ip:" + (request.client.host if request.client else "unbekannt")


async def rate_limit_middleware(request: Request, call_next):
    if not settings.rate_limit_enabled:
        return await call_next(request)

    pfad = request.url.path
    if pfad.startswith(NIE_BEGRENZEN):
        return await call_next(request)

    regel = _regel_fuer(pfad)
    erlaubt, warten = _fenster.zaehle(_schluessel(request), regel, time.time())
    if erlaubt:
        return await call_next(request)

    logger.warning(
        "Anfrage abgewiesen (%s, Grenze %d/%ds): %s",
        pfad, regel.anfragen, regel.fenster, regel.grund,
    )
    return JSONResponse(
        status_code=429,
        content={"detail": "RATE_LIMIT"},
        headers={"Retry-After": str(warten)},
    )

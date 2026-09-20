"""Das Vokabular des Kompasses — Zustände, Anspannung, und was der Krisenplan trägt.

**Warum ein Katalog und keine Beschriftungen im Frontend.** Dieselbe Entscheidung wie beim
Gefühlsbild: Die Worte sind eine fachliche Wahl, keine Gestaltung. Sie stehen an einer
Stelle, damit Oberfläche, Prompt und Auswertung dieselben benutzen — und damit ein neues
Werkzeug ein Eintrag hier ist und keine Migration.

**Warum Worte und keine Gesichter.** Eine Reihe aus 😣😟😐🙂😊 wäre schneller gebaut und
spricht eine andere Sprache als der Rest von EchoB. Ein Wort lässt sich außerdem genauer
treffen als ein Gesicht: „unruhig" und „belastet" sind zwei verschiedene Auskünfte, die
beide als besorgtes Gesicht durchgingen.

**Warum fünf und nicht sieben.** Fünf Stufen kann man antippen, ohne zu vergleichen. Ab
sieben fängt man an zu überlegen, welche denn nun — und der Puls sollte fünf Sekunden
dauern, nicht dreißig.
"""
from __future__ import annotations

from typing import Any

from app.services.gefuehlsbild_katalog import WORTFELD  # dieselbe Sprache wie dort

#: Die fünf Zustände. Die ZAHL wird gespeichert, das Wort steht hier — Beschriftungen
#: ändern sich, gespeicherte Werte sollen es nicht.
ZUSTAENDE: tuple[dict[str, Any], ...] = (
    {"wert": 1, "label": "belastet", "hinweis": "schwer, es drückt"},
    {"wert": 2, "label": "unruhig", "hinweis": "unstet, angespannt"},
    {"wert": 3, "label": "neutral", "hinweis": "weder noch"},
    {"wert": 4, "label": "ruhig", "hinweis": "gelöst, bei mir"},
    {"wert": 5, "label": "gut", "hinweis": "leicht, offen"},
)

#: Ab hier fragt der Puls nach dem, was geholfen hat — und bietet an, es in den
#: Krisenplan zu legen. Der Plan wächst damit aus guten Tagen statt aus einem Formular.
GUTER_ZUSTAND_AB = 4

ANSPANNUNG = {
    "label": "Wie angespannt bist du gerade?",
    "links": "ganz ruhig",
    "rechts": "sehr angespannt",
    "min": 0,
    "max": 10,
}

#: Die Abschnitte des Krisenplans, in der Reihenfolge, in der man sie im Ernstfall liest.
#: Warnzeichen zuerst: Der Plan soll greifen, BEVOR es soweit ist.
KRISENPLAN_TEILE: tuple[dict[str, str], ...] = (
    {
        "key": "warnzeichen",
        "label": "Woran ich merke, dass es kippt",
        "hinweis": "Die frühen Zeichen — nicht die späten. Was passiert zuerst?",
        "beispiel": "Ich antworte niemandem mehr · ich schlafe schlechter",
    },
    {
        "key": "schritte",
        "label": "Was ich dann tue — der Reihe nach",
        "hinweis": "In der Reihenfolge, in der du es versuchst. Das Erste soll leicht sein.",
        "beispiel": "Aus dem Zimmer gehen · eine Runde laufen · X anrufen",
    },
    {
        "key": "menschen",
        "label": "Wen ich anrufe",
        "hinweis": "Name und Nummer. Zwei genügen — eine Liste, die man nicht durchgeht, hilft nicht.",
        "beispiel": "",
    },
    {
        "key": "nicht_tun",
        "label": "Was mir in dem Zustand nicht hilft",
        "hinweis": "Das, was du hinterher bereust. Es hier stehen zu haben, ist die halbe Bremse.",
        "beispiel": "Allein bleiben · Nachrichten schreiben, die ich nicht mehr zurückholen kann",
    },
)

#: Schlüssel, die im Inhalt eines Krisenplans vorkommen dürfen.
KRISENPLAN_SCHLUESSEL: frozenset[str] = frozenset(t["key"] for t in KRISENPLAN_TEILE)

#: Die Wortfamilien des Gefühlsbilds, für den optionalen Schritt „ein Wort dazu".
#: Wiederverwendet statt nachgebaut: Wer beides benutzt, soll nicht zwei Vokabulare lernen.
WORTFAMILIEN = WORTFELD

_ALLE_WORTE: frozenset[str] = frozenset(
    w["key"] for familie in WORTFELD for w in familie["worte"]
)


def zustand_label(wert: int | None) -> str | None:
    """Die Beschriftung zu einem gespeicherten Zustand — oder None, wenn unbekannt."""
    for z in ZUSTAENDE:
        if z["wert"] == wert:
            return z["label"]
    return None


def bereinigen_worte(roh: object) -> list[str]:
    """Nur bekannte Wörter, ohne Dopplungen, höchstens fünf.

    Dieselbe Haltung wie im Gefühlsbild: Was nicht im Katalog steht, kommt nicht in die
    Datenbank. Eine Liste, die alles annimmt, ist später nicht mehr auswertbar — und ein
    Feld, in das ein Aufrufer Beliebiges schreiben kann, ist eine offene Tür.
    """
    if not isinstance(roh, list):
        return []
    gesehen: list[str] = []
    for eintrag in roh:
        if isinstance(eintrag, str) and eintrag in _ALLE_WORTE and eintrag not in gesehen:
            gesehen.append(eintrag)
        if len(gesehen) == 5:
            break
    return gesehen

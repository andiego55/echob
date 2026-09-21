"""Woraus Echos Kontext besteht — als benannte Liste.

**Warum das ueberhaupt einen Namen braucht.** Bis hierher war der Kontext ein Nebenprodukt:
`_kontext_bauen` sammelte ein Dutzend Dinge zusammen, und niemand ausserhalb dieser Funktion
wusste, was drin ist - der Nutzer am allerwenigsten. Er sass vor einem Eingabefeld, das
aussieht wie jedes andere, waehrend im Hintergrund bis zu 30.000 Token Fallwissen mitliefen.

Sobald das im Fenster stehen soll UND abschaltbar sein, braucht jeder Teil einen
Schluessel, ein Wort und eine Zaehlung. Die stehen hier, damit Anzeige und Abschaltung
dieselbe Liste benutzen: Sonst zeigte das Band eines an und der Prompt enthielte ein
anderes - ein Fehler, den niemand bemerkt, weil beide Seiten fuer sich stimmig aussehen.
"""
from __future__ import annotations

from typing import Literal

#: Die Schluessel, die ein Client abschalten darf.
#:
#: Bewusst NICHT dabei: die Steuerung eines zugewiesenen Dialogs. Sie kommt von einer
#: Fachperson, nicht aus dem eigenen Bestand - sie wegzuschalten waere kein
#: Reflexionswerkzeug, sondern ein Umgehen der Aufgabe.
KontextTeil = Literal[
    "szenen",
    "muster",
    "selbstauskunft",
    "fallprofil",
    "themen",
    "hypothesen",
    "erkenntnisse",
    "dokumente",
    "resonanz",
    "gefuehlsbild",
    "saetze",
    "vorhaben",
]

ALLE_TEILE: tuple[str, ...] = (
    "szenen", "muster", "selbstauskunft", "fallprofil",
    "themen", "hypothesen", "erkenntnisse", "dokumente", "resonanz", "gefuehlsbild",
    "saetze", "vorhaben",
)

#: Wort und Erklaerung je Teil — genau so, wie sie im Band stehen.
#:
#: Die Erklaerung ist kein Hilfetext, sondern der Grund, warum man den Teil abschalten
#: koennte. „Ohne die Hypothesen denken" ist ein echter Zug; er faellt leichter, wenn
#: danebensteht, was die Hypothesen mit dem Gespraech machen.
LABELS: dict[str, dict[str, str]] = {
    "szenen": {
        "label": "Szenen",
        "hinweis": "Was du festgehalten hast. Ohne sie antwortet Echo allgemein.",
    },
    "muster": {
        "label": "Muster",
        "hinweis": "Die berechneten Skalenwerte deines Falls.",
    },
    "selbstauskunft": {
        "label": "Selbstauskunft",
        "hinweis": "Dein Beziehungsprofil aus den Modulen.",
    },
    "fallprofil": {
        "label": "Fallprofil",
        "hinweis": "Deine Einschätzung der anderen Person.",
    },
    "themen": {
        "label": "Themendialoge",
        "hinweis": "Zusammenfassungen aus Über mich, Verantwortung und den anderen.",
    },
    "hypothesen": {
        "label": "Hypothesen",
        "hinweis": "Gespeicherte Arbeitshypothesen. Abschalten heißt: unvoreingenommen fragen.",
    },
    "erkenntnisse": {
        "label": "Erkenntnisse",
        "hinweis": "Was du aus früheren Gesprächen festgehalten hast.",
    },
    "dokumente": {
        "label": "Dokumente",
        "hinweis": "Beigelegte Briefe, Chatverläufe, Mitschriften.",
    },
    "resonanz": {
        "label": "Wiedererkanntes",
        "hinweis": "Erfundene Szenen, die dir bekannt vorkamen. Kein Bericht, ein Hinweis.",
    },
    "gefuehlsbild": {
        "label": "Gefühlsbild",
        "hinweis": "Wie es dir zuletzt ging — von dir selbst festgehalten.",
    },
    # Der einzige Teil, der NICHT aus diesem Fall stammt: Er kommt aus dem Kompass und
    # gilt ueber alle Beziehungen hinweg. Deshalb steht das im Hinweis - sonst wundert
    # man sich, woher Echo etwas weiss, das man hier nie geschrieben hat.
    "saetze": {
        "label": "Sätze über dich",
        "hinweis": "Was du in deinem Kompass über dich bestätigt hast — unabhängig von diesem Fall.",
    },
    # Wie die Saetze aus dem Kompass und damit fallunabhaengig. Der Hinweis sagt, was
    # Echo damit NICHT tut: Ohne das erwartet man Nachfragen zum Stand - und schaltet
    # den Teil ab, weil man sie nicht will.
    "vorhaben": {
        "label": "Deine Vorhaben",
        "hinweis": "Woran du gerade arbeitest. Echo fragt nie nach, wie weit du bist.",
    },
}


def normalisieren(roh: list[str] | None) -> set[str]:
    """Unbekannte Schluessel verwerfen — ein Tippfehler darf nichts still abschalten."""
    if not roh:
        return set()
    return {t for t in roh if t in ALLE_TEILE}

"""„Deine Fassung" — der Weg von einer wiedererkannten Szene zur eigenen.

**Was hier verhindert wird.** Bis September 2026 wurde aus einer Reaktion plus drei Sätzen
mit zwei Klicks eine Fall-Szene. Zu wenig für das, was eine Szene in diesem System ist: die
präzise Beschreibung eines Ereignisses, die in die Musterberechnung geht, in Berichte, und
womöglich einer Fachperson vorgelegt wird.

Schlimmer als die Ungenauigkeit war ihre **Richtung**. Wer eine erfundene Szene liest und
direkt danach die eigene aufschreibt, übernimmt ihre Einzelheiten — das Abendessen, den
Witz, das Timing. Die Erinnerung formt sich nach dem Text, den man gerade gelesen hat. Eine
geliehene Szene ist schlechter als keine, weil sie sich hinterher nicht mehr von einer
erlebten unterscheiden lässt. Die erste Fassung dieses Features hat das sogar betrieben:
Sie setzte den Titel der erfundenen Szene in die eigene Akte.

**Zwei Entscheidungen tragen dieses Modul.**

1. *Dieselben Fragen wie sonst auch.* Die sechs geführten Fragen unten stehen wortgleich in
   ``SceneNewPage`` (``GUIDED_QUESTIONS``). Nicht aus Sparsamkeit: Eine Szene, die auf
   diesem Weg entsteht, soll von einer direkt geschriebenen nicht zu unterscheiden sein —
   im Text nicht und in der Qualität nicht. Ein eigener Fragensatz hier hätte zwei Sorten
   Szenen erzeugt, und die schlechtere wäre die aus dem bequemeren Weg gewesen.

2. *Eine siebte Frage, die es nur hier gibt.* „Was ist bei dir anders als in der
   Geschichte?" lässt sich nur aus der eigenen Erinnerung beantworten. Sie macht aus der
   Vorlage eine Kontrastfolie — und sie ist deshalb **Pflicht**, obwohl fünf der sechs
   anderen es nicht sind.
"""
from __future__ import annotations

from typing import Any

#: Die geführten Fragen. Reihenfolge und Wortlaut absichtlich wie in ``SceneNewPage``.
#:
#: ``anders`` steht am Ende und nicht am Anfang: Wer zuerst gefragt wird, was anders ist,
#: denkt beim Schreiben die ganze Zeit an die Geschichte. Wer zuerst sein eigenes Ereignis
#: aufschreibt und DANN vergleicht, hat schon etwas Eigenes, an dem er vergleichen kann.
FRAGEN: tuple[dict[str, Any], ...] = (
    {"key": "what",   "label": "Was ist passiert?",
     "hinweis": "Nur, was jemand hätte sehen oder hören können. Die Deutung kommt später.",
     "pflicht": True},
    {"key": "said",   "label": "Was wurde gesagt oder getan?",
     "hinweis": "Wenn du einen Satz noch im Ohr hast: schreib ihn wörtlich.",
     "pflicht": False},
    {"key": "react",  "label": "Wie hast du reagiert?",
     "hinweis": "Was du gesagt, getan oder gerade nicht getan hast.",
     "pflicht": False},
    {"key": "feel",   "label": "Wie hast du dich gefühlt?",
     "hinweis": None, "pflicht": False},
    {"key": "after",  "label": "Was ist danach passiert?",
     "hinweis": None, "pflicht": False},
    {"key": "repeat", "label": "Ist so etwas schon öfter vorgekommen?",
     "hinweis": None, "pflicht": False},
    {"key": "anders", "label": "Was ist bei dir anders als in der Geschichte?",
     "hinweis": "Die wichtigste Frage hier. Was in der erfundenen Szene stimmt für dich "
                "nicht? Auch „fast alles, nur das Gefühl nicht“ ist eine Antwort.",
     "pflicht": True},
)

FRAGE_KEYS: tuple[str, ...] = tuple(f["key"] for f in FRAGEN)
PFLICHT_KEYS: tuple[str, ...] = tuple(f["key"] for f in FRAGEN if f["pflicht"])

#: Zusätzliche Felder, die keine Frage sind: Überschrift, Wann, Wo.
#:
#: ``titel`` kommt von der Person. Die erste Fassung setzte hier den Titel der erfundenen
#: Szene ein („Wiedererkannt: …") — die fremde Überschrift stand damit als Erstes in der
#: eigenen Akte, und genau das ist die Vermischung, um die es geht.
KOPF_KEYS: tuple[str, ...] = ("titel", "wann", "ort")

ALLE_KEYS: tuple[str, ...] = FRAGE_KEYS + KOPF_KEYS

#: Ab wann eine Antwort eine Antwort ist.
#:
#: „war so" ist keine Beschreibung eines Ereignisses. Die Grenze ist niedrig genug für zwei
#: kurze Sätze und hoch genug, dass ein Wort nicht durchgeht.
MIN_ZEICHEN_PFLICHT = 40
MAX_ZEICHEN_ANTWORT = 4000
MAX_ZEICHEN_TITEL = 120


def bereinigen(roh: object) -> dict[str, str]:
    """Nur bekannte Schlüssel, nur Zeichenketten, gekappt.

    Unbekanntes wird verworfen statt übernommen: Das Feld landet verschlüsselt in der
    Datenbank und später im Text einer Szene — was hier hineinkommt, muss aus dieser Liste
    stammen.
    """
    if not isinstance(roh, dict):
        return {}
    sauber: dict[str, str] = {}
    for key in ALLE_KEYS:
        wert = roh.get(key)
        if not isinstance(wert, str):
            continue
        grenze = MAX_ZEICHEN_TITEL if key == "titel" else MAX_ZEICHEN_ANTWORT
        gestutzt = wert.strip()[:grenze]
        if gestutzt:
            sauber[key] = gestutzt
    return sauber


def fehlt_noch(fassung: dict[str, str] | None) -> list[str]:
    """Welche Pflichtfelder fehlen — als Labels, nicht als Schlüssel.

    Die Liste geht ins Frontend und wird dort angezeigt. Schlüssel wären für niemanden
    lesbar, und eine zweite Übersetzungstabelle drüben wäre eine Stelle mehr, an der beide
    Seiten auseinanderlaufen können.
    """
    daten = fassung or {}
    offen: list[str] = []
    for frage in FRAGEN:
        if not frage["pflicht"]:
            continue
        wert = (daten.get(frage["key"]) or "").strip()
        if len(wert) < MIN_ZEICHEN_PFLICHT:
            offen.append(frage["label"])
    if not (daten.get("titel") or "").strip():
        offen.append("Eine Überschrift in deinen Worten")
    return offen


def ist_vollstaendig(fassung: dict[str, str] | None) -> bool:
    return not fehlt_noch(fassung)


def als_szenentext(fassung: dict[str, str]) -> str:
    """Die Antworten als Beschreibungstext einer Szene.

    Aufbau wie bei der geführten Erfassung: Frage, Zeilenumbruch, Antwort. Damit liest sich
    eine so entstandene Szene wie jede andere geführte — und ein Bericht, der sie zitiert,
    muss nicht zwei Formate kennen.

    ``anders`` steht NICHT im Text. Es ist die Frage, die beim Schreiben die Trennung
    erzwingt — im fertigen Ereignis hat der Vergleich mit einer erfundenen Geschichte nichts
    zu suchen. Wer die Szene in einem halben Jahr liest, soll sein Erlebnis vorfinden, nicht
    dessen Entstehungsgeschichte.
    """
    teile: list[str] = []
    if fassung.get("wann") or fassung.get("ort"):
        ort_zeit = " · ".join(x for x in (fassung.get("wann"), fassung.get("ort")) if x)
        teile.append(f"Wann und wo\n{ort_zeit}")
    for frage in FRAGEN:
        if frage["key"] == "anders":
            continue
        wert = (fassung.get(frage["key"]) or "").strip()
        if wert:
            teile.append(f"{frage['label']}\n{wert}")
    return "\n\n".join(teile)

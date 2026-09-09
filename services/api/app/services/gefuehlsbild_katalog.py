"""Das Vokabular des Gefühlsbildes — Wortfeld, Achsen und Regler.

**Warum ein Wortfeld und kein Textfeld.** Wer belastet ist, hat die Worte oft nicht. Nicht
aus Unwilligkeit — sie sind nicht da, oder das einzige, das kommt, ist „schlecht". Ein
leeres Feld, das nach Gefühlen fragt, läuft bei genau diesen Menschen leer, und das sind
die, um die es geht.

**Zwei Ebenen, und das ist der ganze Trick.** Sieben Familien, die jeder benennen kann,
auch wenn es ihm schlecht geht. Wer eine antippt, bekommt ihre genaueren Wörter — „schlecht"
wird zu *beschämt, klein, wertlos, schuldig*. Das ist die Bewegung, um die es geht: vom
groben zum genauen Wort, ohne dass jemand vorher wissen muss, wonach er sucht.

**Die siebte Familie ist keine Höflichkeit.** Ein Werkzeug, das nur Belastendes anbietet,
erzeugt ein Bild, in dem nur Belastendes vorkommt — und der Mensch liest hinterher, dass es
ihm ausschließlich schlecht geht. „Zugewandt" gehört dazu, auch wenn es selten angetippt
wird; dass es *dasteht* und nicht gewählt wurde, ist selbst eine Aussage.
"""
from __future__ import annotations

from typing import Any

# ── Das Wortfeld ─────────────────────────────────────────────────────────────
#
# Die Auswahl ist nicht aus einem Lehrbuch, sondern aus dem Material: Sie deckt die
# haeufigsten `scene_tags` der 178 Szenen ab und die acht Wirkungen aus `resonanz_katalog`.
# Woerter, die in diesem Zusammenhang niemand benutzt ("euphorisch", "angewidert"), fehlen
# bewusst - eine lange Liste, in der das Eigene nicht vorkommt, ist schlimmer als eine
# kurze, in der es vorkommt.
WORTFELD: tuple[dict[str, Any], ...] = (
    {
        "key": "traurig",
        "label": "Traurig",
        "worte": [
            {"key": "traurig", "label": "traurig"},
            {"key": "verletzt", "label": "verletzt"},
            {"key": "enttaeuscht", "label": "enttäuscht"},
            {"key": "einsam", "label": "einsam"},
            {"key": "sehnsuechtig", "label": "sehnsüchtig"},
            {"key": "leer", "label": "leer"},
        ],
    },
    {
        "key": "wuetend",
        "label": "Wütend",
        "worte": [
            {"key": "wuetend", "label": "wütend"},
            {"key": "gereizt", "label": "gereizt"},
            {"key": "empoert", "label": "empört"},
            {"key": "verbittert", "label": "verbittert"},
            {"key": "ohnmaechtig", "label": "ohnmächtig"},
            {"key": "genervt", "label": "genervt"},
        ],
    },
    {
        "key": "aengstlich",
        "label": "Ängstlich",
        "worte": [
            {"key": "aengstlich", "label": "ängstlich"},
            {"key": "unruhig", "label": "unruhig"},
            {"key": "angespannt", "label": "angespannt"},
            {"key": "wachsam", "label": "wachsam"},
            {"key": "besorgt", "label": "besorgt"},
            {"key": "misstrauisch", "label": "misstrauisch"},
        ],
    },
    {
        "key": "erschoepft",
        "label": "Erschöpft",
        "worte": [
            {"key": "erschoepft", "label": "erschöpft"},
            {"key": "ausgelaugt", "label": "ausgelaugt"},
            {"key": "stumpf", "label": "stumpf"},
            {"key": "ueberfordert", "label": "überfordert"},
            {"key": "resigniert", "label": "resigniert"},
            {"key": "kraftlos", "label": "kraftlos"},
        ],
    },
    {
        "key": "beschaemt",
        "label": "Beschämt",
        "worte": [
            {"key": "beschaemt", "label": "beschämt"},
            {"key": "klein", "label": "klein"},
            {"key": "schuldig", "label": "schuldig"},
            {"key": "wertlos", "label": "wertlos"},
            {"key": "unsichtbar", "label": "unsichtbar"},
            {"key": "blossgestellt", "label": "bloßgestellt"},
        ],
    },
    {
        "key": "verwirrt",
        "label": "Verwirrt",
        "worte": [
            {"key": "verwirrt", "label": "verwirrt"},
            {"key": "unsicher", "label": "unsicher"},
            {"key": "zerrissen", "label": "zerrissen"},
            {"key": "zweifelnd", "label": "zweifelnd"},
            {"key": "orientierungslos", "label": "orientierungslos"},
            {"key": "taub", "label": "wie betäubt"},
        ],
    },
    {
        "key": "zugewandt",
        "label": "Zugewandt",
        "worte": [
            {"key": "erleichtert", "label": "erleichtert"},
            {"key": "ruhig", "label": "ruhig"},
            {"key": "hoffnungsvoll", "label": "hoffnungsvoll"},
            {"key": "verbunden", "label": "verbunden"},
            {"key": "dankbar", "label": "dankbar"},
            {"key": "klar", "label": "klar"},
        ],
    },
)

WORT_LABELS: dict[str, str] = {
    w["key"]: w["label"] for familie in WORTFELD for w in familie["worte"]
}
FAMILIE_VON: dict[str, str] = {
    w["key"]: familie["label"] for familie in WORTFELD for w in familie["worte"]
}

#: Wie viele Wörter jemand wählen darf.
#:
#: Wer zwanzig waehlt, hat nichts gesagt. Acht sind genug fuer einen widerspruechlichen
#: Zustand ("erleichtert UND schuldig" ist eine echte und haeufige Kombination) und knapp
#: genug, dass die Auswahl eine Entscheidung bleibt.
MAX_WORTE = 8

#: Wie viele Szenen ins Bild dürfen. Aus demselben Grund.
MAX_SZENEN = 7


# ── Das Feld ─────────────────────────────────────────────────────────────────
#
# Zwei Achsen, die zusammen den emotionalen Grundzustand aufspannen (Valenz mal
# Aktivierung). Sie sind das eine Werkzeug hier, das voellig ohne Worte auskommt: Man zieht
# einen Punkt, und die Ecke, in der er landet, hat einen Namen.
FELD_ACHSEN: tuple[dict[str, Any], ...] = (
    {
        "key": "valenz",
        "label": "Wie fühlt es sich an?",
        "links": "unangenehm",
        "rechts": "angenehm",
    },
    {
        "key": "aktivierung",
        "label": "Wie viel ist los in dir?",
        "links": "ruhig",
        "rechts": "aufgewühlt",
    },
)

#: Wie die vier Ecken des Feldes heissen.
#:
#: Ohne Namen waere der Punkt eine Zahl ohne Bedeutung; mit Namen ist die Bewegung selbst
#: schon eine Auskunft ("ich bin nicht traurig, ich bin angespannt" ist fuer manche die
#: erste Unterscheidung, die sie treffen).
FELD_ECKEN: dict[str, str] = {
    "unangenehm_aufgewuehlt": "angespannt, aufgebracht",
    "unangenehm_ruhig": "schwer, erschöpft",
    "angenehm_aufgewuehlt": "lebendig, aufgedreht",
    "angenehm_ruhig": "ruhig, gelöst",
}


def ecke_von(valenz: int | None, aktivierung: int | None) -> str | None:
    """Der Name der Ecke, in der der Punkt liegt. Skala 0–100, Mitte ist 50."""
    if valenz is None or aktivierung is None:
        return None
    v = "angenehm" if valenz >= 50 else "unangenehm"
    a = "aufgewuehlt" if aktivierung >= 50 else "ruhig"
    return FELD_ECKEN[f"{v}_{a}"]


# ── Die beiden Regler ────────────────────────────────────────────────────────
#
# Beide fragen nach etwas, das sich aus Valenz und Aktivierung NICHT ableiten laesst - man
# kann ruhig und zugleich sehr fern sein. Genau deshalb sind es diese zwei und keine fuenf.
REGLER: tuple[dict[str, Any], ...] = (
    {
        "key": "naehe",
        "label": "Wie nah fühlst du dich der anderen Person gerade?",
        "links": "sehr fern",
        "rechts": "sehr nah",
    },
    {
        "key": "sicherheit",
        "label": "Wie sicher fühlst du dich in der Beziehung gerade?",
        "links": "auf der Hut",
        "rechts": "sicher",
    },
)

FELD_KEYS: tuple[str, ...] = tuple(
    [a["key"] for a in FELD_ACHSEN] + [r["key"] for r in REGLER]
)

MAX_ZEICHEN_EIGENES = 2000
MAX_ZEICHEN_BERICHT = 4000


def bereinigen_woerter(roh: object) -> list[str]:
    """Nur bekannte Wörter, in der Reihenfolge des Feldes, gekappt.

    Reihenfolge des Feldes und nicht der Auswahl: Ein Bild, das sich je nach Klickfolge
    anders liest, laesst sich zwischen zwei Wochen nicht vergleichen.
    """
    if not isinstance(roh, list):
        return []
    gewaehlt = {w for w in roh if isinstance(w, str) and w in WORT_LABELS}
    geordnet = [w["key"] for f in WORTFELD for w in f["worte"] if w["key"] in gewaehlt]
    return geordnet[:MAX_WORTE]


def bereinigen_feld(roh: object) -> dict[str, int]:
    """Nur bekannte Achsen, nur ganze Zahlen von 0 bis 100."""
    if not isinstance(roh, dict):
        return {}
    sauber: dict[str, int] = {}
    for key in FELD_KEYS:
        wert = roh.get(key)
        if isinstance(wert, bool):
            continue
        if isinstance(wert, (int, float)):
            sauber[key] = max(0, min(100, int(wert)))
    return sauber

"""Der gemalte Weg: Bildwelten, Metaphern und der Prompt.

Konzept: https://claude.ai/code/artifact/dc994cdb-d9d1-475d-a856-d93e0035d6e1

**Die Grenze lag erst am falschen Ort.** Die erste Fassung verbot alles Gegenständliche und
ließ nur Formen zu — mit dem Ergebnis, dass niemand etwas darin lesen konnte und es nebenbei
auch nicht schön war. Ein Bild, das man nicht deuten kann, hilft niemandem.

Die Sorge dahinter war richtig, aber sie zielte auf etwas Engeres:

* **Keine Abbildung der anderen Person.** Sie hat einen Namen und existiert; ein Bild von ihr
  wäre eine Darstellung eines echten Menschen aus den Angaben einer Seite.
* **Keine Nachstellung eines Vorfalls.** Was ein Bild an Details hinzufügt — Licht, Haltung,
  Abstand —, ist erfunden und sieht trotzdem aus wie ein Zeuge.

**Beides bleibt verboten. Alles andere ist jetzt erlaubt.** Ein schmaler Pfad durch dichtes
Gestrüpp, ein Licht hinter einem Fenster, ein ausgetrocknetes Flussbett, Wetter, das von einer
Seite aufzieht — das sind Bilder für einen Zustand, keine Behauptungen über ein Geschehen.
Metaphern sind in der Arbeit mit Menschen ein altes Werkzeug, gerade weil sie ausdrücken, was
sich schlecht sagen lässt, ohne es festzunageln.

**Die Metapher wählt die Person, nicht wir.** Sie sucht die Bildwelt aus; wir setzen nur ihre
eigenen Zahlen hinein. Ein Modell, das sich das Gleichnis selbst aussucht, würde deuten.

**Der Prompt ist auf Englisch**, weil Bildmodelle englischen Bildanweisungen zuverlässiger
folgen. Es steht kein Satz über einen Menschen darin, der übersetzt werden müsste.
"""
from __future__ import annotations

from typing import Any


def _stufe(wert: float, niedrig: str, mittel: str, hoch: str) -> str:
    """Eine Zahl 0..1 als Bildworte. Ein Modell kann mit „0,72" nichts anfangen."""
    if wert < 0.34:
        return niedrig
    if wert < 0.67:
        return mittel
    return hoch


def _von_hundert(wert: float) -> str:
    """Ein normalisierter Wert für die Legende — in der Sprache, die der Rest der App spricht.

    Die Skalen stehen überall sonst als „68 von 100" da. Eine Legende, die stattdessen
    „stark ausgeprägt" sagt, wäre eine zweite Skala neben der ersten.
    """
    return f"{round(max(0.0, min(1.0, wert)) * 100)} von 100"


def _menge(zahl: int, wenig: str, mittel: str, viel: str) -> str:
    if zahl <= 4:
        return wenig
    if zahl <= 14:
        return mittel
    return viel


# ── Die Bildwelten ───────────────────────────────────────────────────────────
#
# Jede übersetzt dieselben Größen in ihre eigene Sprache. Das ist der Kern dieser
# Datei: Nicht „ein Bild zu meinem Fall", sondern **dieselbe Struktur, in einem Gleichnis, das
# die Person gewählt hat.**
#
# Jede Bildwelt bringt mit:
#   format     Welches Seitenverhaeltnis dem Ort entspricht (breit/hoch/quadrat).
#   szene      Der Ort selbst, ohne alles Weitere.
#   textur     Wie hart die Welt ist (aus der DURCHSCHNITTLICHEN Belastung).
#   faden      Das Wiederkehrende, das durch alles läuft (aus den Mustern).
#   licht      Die Erkenntnisse — das Einzige, was leuchtet.
#   leere      Was fehlt, als sichtbare Abwesenheit.
#   druck      Die andere Person: nie Gestalt, immer Wetter, Masse oder Richtung.

BILDWELTEN: tuple[dict[str, Any], ...] = (
    {
        "key": "landschaft",
        "label": "Landschaft",
        "hinweis": "Ein Gelände mit Wetter und Weite — was zu gehen ist, liegt vor dir.",
        "format": "breit",
        "szene": "a wide open landscape seen from a low vantage point, distant horizon",
        "textur": {
            "weich": "soft moss and low grass, everything rounded by weather",
            "mittel": "gravel and hard-packed earth, some loose stones",
            "hart": "sharp broken rock and frost-split stone, thorn scrub",
        },
        "faden": "a dry stone wall running the full width of the scene, crossing the path "
                 "and continuing past both edges",
        "licht": "a few small warm lights glowing somewhere in the distance",
        "leere": "clearings of bare untouched ground where nothing grows and nothing has "
                 "been built",
        "druck": "heavy weather massing along one edge of the sky and leaning over the "
                 "whole scene",
    },
    {
        "key": "wasser",
        "label": "Wasser",
        "hinweis": "Strömung, Tiefe und Stille — was trägt und was zieht.",
        "format": "breit",
        "szene": "a body of water seen close to its surface, depth suggested below",
        "textur": {
            "weich": "warm slow water, soft blurred reflections",
            "mittel": "cool clear water with a defined surface",
            "hart": "black cold water and thin breaking ice at the edges",
        },
        "faden": "a strong undercurrent visible as a darker band running from edge to edge "
                 "beneath everything",
        "licht": "a few points of light caught on the surface, the brightest things present",
        "leere": "patches of completely motionless water, glassy and untouched, that nothing "
                 "reaches",
        "druck": "a heavy swell building along one side, compressing everything toward the "
                 "opposite edge",
    },
    {
        "key": "haus",
        "label": "Haus",
        "hinweis": "Räume, Türen und Fenster — von außen gesehen, leer.",
        "format": "hoch",
        "szene": "the inside of an old building seen as empty rooms and passages, no one "
                 "present",
        "textur": {
            "weich": "worn wood, faded fabric, softened edges of long use",
            "mittel": "plain plaster and bare board, honest and unadorned",
            "hart": "cracked concrete, bare metal fittings, splintered frames",
        },
        "faden": "a single crack running through floor, wall and ceiling across every room",
        "licht": "warm light falling through one or two windows into the rooms",
        "leere": "doorways that open onto nothing but blank untouched wall",
        "druck": "one wall leaning inward under load, the rooms narrowing toward it",
    },
    {
        "key": "wald",
        "label": "Wald",
        "hinweis": "Dickicht, Wurzeln und Lichtungen — was wächst und was verdeckt.",
        "format": "hoch",
        "szene": "deep woodland seen from within, trunks receding into depth",
        "textur": {
            "weich": "moss, soft bark, deep leaf litter",
            "mittel": "dry bark and fallen branches",
            "hart": "blackened burnt trunks, brittle dead wood, thorn",
        },
        "faden": "exposed roots running across the whole forest floor from edge to edge, "
                 "under everything",
        "licht": "shafts of light reaching the forest floor in a few places",
        "leere": "clearings of bare earth where nothing has grown back",
        "druck": "the canopy pressed down and bent from one side, all growth leaning away "
                 "from it",
    },
    {
        "key": "himmel",
        "label": "Himmel",
        "hinweis": "Wetter, Weite und Ferne — Stimmung ohne Boden.",
        "format": "breit",
        "szene": "an expanse of sky seen from below, with weather and depth",
        "textur": {
            "weich": "soft diffuse cloud, hazy light",
            "mittel": "defined cloud forms with clear edges",
            "hart": "hard-edged anvil cloud, cold sharp air, thin high ice",
        },
        "faden": "a single long streak of cloud crossing the entire sky from edge to edge",
        "licht": "a few breaks where bright light comes through",
        "leere": "areas of completely empty, colourless sky that nothing crosses",
        "druck": "a front advancing from one side, darkening and compressing everything "
                 "ahead of it",
    },
    {
        "key": "faden",
        "label": "Faden",
        "hinweis": "Gewebe, Knoten und Risse — was hält und was reißt.",
        "format": "quadrat",
        "szene": "a large woven textile seen close up, its structure visible",
        "textur": {
            "weich": "soft worn wool, gently frayed",
            "mittel": "plain linen, honest and even",
            "hart": "stiff wire-like thread, cut ends, hard knots",
        },
        "faden": "one continuous thread of a different colour running through the entire "
                 "weave from edge to edge",
        "licht": "a few threads catching the light and glowing",
        "leere": "holes in the fabric where the threads are simply missing",
        "druck": "the whole weave pulled taut toward one edge, distorted by the tension",
    },
)

# ── Die Muster werden Bilder ─────────────────────────────────────────────────
#
# **Hier entscheidet sich, ob jemand seinen eigenen Fall wiedererkennt.**
#
# Bisher entstand der Prompt aus Durchschnitten: wie viele Momente, wie dicht, wie hart im
# Mittel. Zwei ganz verschiedene Fälle mit ähnlichen Zahlen ergaben ähnliche Bilder — und
# genau deshalb sah keiner darin seine eigene Lage.
#
# Was einen Fall unterscheidet, sind die MUSTER. Sie bekommen deshalb je ein eigenes Bild.
#
# **Der Schlüssel der Skala geht trotzdem nie an das Modell.** Er wählt hier ein Bild AUS,
# das wir geschrieben haben; das Wort selbst bleibt im Haus. So bleibt in unserer Hand, was
# dargestellt wird — „Grenzverletzung" als Wort an ein Bildmodell wäre eine Einladung, sich
# etwas dazu auszudenken.
#
# **NICHT jede Skala wird ein Bild.**
#
# Die Persönlichkeitswerte der anderen Person, `cluster_b_traits` und `empathy_deficit`
# beschreiben einen MENSCHEN und nicht die Lage. Sie in ein Bild zu übersetzen wäre eine
# Diagnose in Bildform — dieselbe Behauptung, die dieses Projekt in jedem Prompt ausschließt,
# nur ohne die Möglichkeit, ihr zu widersprechen.
#
# `safety_risk` fehlt mit Absicht: Ein Bild, das Gefahr dramatisiert, hilft niemandem, der in
# einer gefährlichen Lage ist — es macht Angst und sagt nichts, was die Person nicht wüsste.
# Für die Sicherheit gibt es Hinweise, keine Sinnbilder.

MUSTER_BILDER: dict[str, dict[str, Any]] = {
    "boundary_violation": {
        "bild": "{ding} that has been broken through in several places, the gaps raw and "
                "not repaired",
        "je_welt": {
            "landschaft": "a long stone wall", "wasser": "a line of old breakwater posts",
            "haus": "an interior wall", "wald": "an old fence between the trees",
            "himmel": "a bank of cloud", "faden": "a woven border",
        },
    },
    "control_isolation": {
        "bild": "{ding} leading away from everything else — no other route is visible "
                "anywhere in the image, and the edges close in",
        "je_welt": {
            "landschaft": "a single narrow path", "wasser": "one channel between sandbanks",
            "haus": "one corridor", "wald": "one gap between the thickets",
            "himmel": "one clear lane between cloud walls", "faden": "one thread",
        },
    },
    "proximity_distance": {
        "bild": "{ding} that comes very close and then pulls far away again, over and over, "
                "never settling at one distance",
        "je_welt": {
            "landschaft": "a path", "wasser": "the tideline", "haus": "the wall of a room",
            "wald": "the treeline", "himmel": "the cloud base", "faden": "the weave",
        },
    },
    "conflict_escalation": {
        "bild": "{ding} building from something small at one edge into something that takes "
                "up the whole far side",
        "je_welt": {
            "landschaft": "weather", "wasser": "a swell", "haus": "a crack",
            "wald": "a windthrow", "himmel": "a storm front", "faden": "a tear",
        },
    },
    "perception_distortion": {
        "bild": "{ding} that does not match what should cast it — the reflection and the "
                "thing disagree, quietly and unmistakably",
        "je_welt": {
            "landschaft": "a still pool with a reflection",
            "wasser": "the mirrored surface", "haus": "a window reflection",
            "wald": "water standing between roots", "himmel": "light on a cloud layer",
            "faden": "a repeated pattern",
        },
    },
    "guilt_shifting": {
        "bild": "{ding} tilted so that everything slides toward one side and gathers there, "
                "although nothing is holding it",
        "je_welt": {
            "landschaft": "the ground", "wasser": "the whole surface", "haus": "the floor",
            "wald": "the forest floor", "himmel": "the whole sky", "faden": "the fabric",
        },
    },
    "responsibility_deflection": {
        "bild": "{ding} whose beginning cannot be found anywhere — it simply is there, "
                "with no source visible in the image",
        "je_welt": {
            "landschaft": "a track", "wasser": "a current", "haus": "a draught of cold air",
            "wald": "a trail", "himmel": "a wind", "faden": "a thread",
        },
    },
}


#: Wie ein Muster in der Legende heißt.
#:
#: **Nur hier, nie im Prompt.** Das Wort steht der Person gegenüber, damit sie erkennt, was
#: das Leitbild ihres Bildes trägt — ans Modell geht es nicht, weil es sich sonst selbst etwas
#: dazu ausdenkt.
MUSTER_LABEL: dict[str, str] = {
    "boundary_violation": "überschrittene Grenzen",
    "control_isolation": "Kontrolle und Alleinsein",
    "proximity_distance": "der Wechsel aus Nähe und Abstand",
    "conflict_escalation": "Konflikte, die hochgehen",
    "perception_distortion": "Zweifel an der eigenen Wahrnehmung",
    "guilt_shifting": "Schuld, die bei dir landet",
    "responsibility_deflection": "Verantwortung, die niemand übernimmt",
}


#: Wie das Musterbild auf Deutsch heißt — **damit die Legende den Gegenstand nennt.**
#:
#: Die Legende sagte erst nur „dein stärkstes Muster: Schuld, die bei dir landet. Es bestimmt,
#: was auf dem Bild zu sehen ist." Damit weiß niemand, WORAN er die Schuld im Bild erkennt —
#: die Zeile nennt eine Deutung und verschweigt das Motiv. Hier steht dasselbe Bild in der
#: Sprache der Person: der Gegenstand, und was mit ihm los ist.
#:
#: **Getrennt von `MUSTER_BILDER` und nicht als weiteres Feld darin.** Was im selben
#: Wörterbuch steht wie der Prompt-Baustein, landet eines Tages im Prompt — und ein Modell
#: benutzt jedes benennbare Material als Sprache. Hier kommt es gar nicht in die Nähe.
#:
#: Die Sätze sind so gebaut, dass sie ohne Rückbezug auskommen: `{ding} ist gekippt` geht für
#: der, die und das. Ein `{ding}, der …` wäre bei „Die Wasserlinie" falsch.
MUSTER_DEUTSCH: dict[str, dict[str, Any]] = {
    "boundary_violation": {
        "satz": "{ding} ist an mehreren Stellen durchbrochen, und die Lücken sind offen "
                "geblieben",
        "je_welt": {
            "landschaft": "Eine lange Steinmauer",
            "wasser": "Eine Reihe alter Wellenbrecher",
            "haus": "Eine Wand im Innern",
            "wald": "Ein alter Zaun zwischen den Bäumen",
            "himmel": "Eine Wolkenbank",
            "faden": "Eine gewebte Kante",
        },
    },
    "control_isolation": {
        "satz": "{ding} führt von allem anderen weg — ein zweiter Weg ist nirgends im Bild "
                "zu sehen, und die Ränder rücken näher",
        "je_welt": {
            "landschaft": "Ein einziger schmaler Pfad",
            "wasser": "Eine einzige Fahrt zwischen den Sandbänken",
            "haus": "Ein einziger Gang",
            "wald": "Eine einzige Lücke im Dickicht",
            "himmel": "Eine einzige freie Bahn zwischen Wolkenwänden",
            "faden": "Ein einziger Faden",
        },
    },
    "proximity_distance": {
        "satz": "{ding} kommt sehr nah und zieht sich wieder weit zurück, immer wieder, und "
                "bleibt auf keinem Abstand",
        "je_welt": {
            "landschaft": "Der Weg", "wasser": "Die Wasserlinie",
            "haus": "Die Wand des Raums", "wald": "Der Waldrand",
            "himmel": "Die Wolkenuntergrenze", "faden": "Das Gewebe",
        },
    },
    "conflict_escalation": {
        "satz": "{ding} beginnt klein an einem Rand und nimmt auf der anderen Seite das "
                "ganze Bild ein",
        "je_welt": {
            "landschaft": "Das Wetter", "wasser": "Eine Dünung", "haus": "Ein Riss",
            "wald": "Ein Windbruch", "himmel": "Eine Sturmfront",
            "faden": "Ein Riss im Gewebe",
        },
    },
    "perception_distortion": {
        "satz": "{ding} passt nicht zu dem, was dort zu sehen sein müsste — Spiegelbild und "
                "Sache widersprechen sich, leise und unverkennbar",
        "je_welt": {
            "landschaft": "Ein stiller Tümpel mit seinem Spiegelbild",
            "wasser": "Die spiegelnde Oberfläche",
            "haus": "Eine Spiegelung im Fenster",
            "wald": "Wasser, das zwischen den Wurzeln steht",
            "himmel": "Das Licht auf einer Wolkenschicht",
            "faden": "Ein Muster, das sich wiederholt",
        },
    },
    "guilt_shifting": {
        "satz": "{ding} ist zu einer Seite gekippt: Alles rutscht dorthin und sammelt sich, "
                "obwohl nichts es dort hält",
        "je_welt": {
            "landschaft": "Der Boden", "wasser": "Die ganze Wasserfläche",
            "haus": "Der Fußboden", "wald": "Der Waldboden",
            "himmel": "Der ganze Himmel", "faden": "Der Stoff",
        },
    },
    "responsibility_deflection": {
        "satz": "{ding} hat keinen Anfang, der im Bild zu finden wäre — einfach da, ohne "
                "sichtbare Quelle",
        "je_welt": {
            "landschaft": "Eine Spur", "wasser": "Eine Strömung",
            "haus": "Ein Zug kalter Luft", "wald": "Ein Pfad", "himmel": "Ein Wind",
            "faden": "Ein Faden",
        },
    },
}


def muster_deutsch(key: str, welt: str) -> tuple[str, str] | None:
    """Der Gegenstand und der ganze Satz dazu — **nur für die Legende.**

    Gibt `(„Der Boden", „Der Boden ist zu einer Seite gekippt: …")` zurück: das Erste für die
    Spalte „was zu sehen ist", das Zweite für die Erklärung daneben.
    """
    eintrag = MUSTER_DEUTSCH.get(key)
    if not eintrag:
        return None
    ding = eintrag["je_welt"].get(welt)
    if not ding:
        return None
    return ding, eintrag["satz"].format(ding=ding)


def muster_bild(key: str, welt: str) -> str | None:
    """Das Bild zu einem Muster — oder nichts, wenn es dafür keines geben soll."""
    eintrag = MUSTER_BILDER.get(key)
    if not eintrag:
        return None
    ding = eintrag["je_welt"].get(welt)
    if not ding:
        return None
    return eintrag["bild"].format(ding=ding)


#: Wie die Beziehungsart den Ton setzt.
#:
#: **Ein Elternfall und ein Partnerfall dürfen nicht gleich aussehen.** Das ist keine Aussage
#: über die andere Person, sondern über die Art der Beziehung — und sie ist das Erste, was
#: jemand an seinem eigenen Fall wiedererkennt.
BEZIEHUNGSTON: dict[str, str] = {
    "partner": "The place feels shared and lived in, as if two people had used it.",
    "ex_partner": "The place has been left: everything is still there, but nothing is in use.",
    "parent": "The place is older than the viewer — it was here first and will remain.",
    "child": "The place is young and unfinished, still being made.",
    "sibling": "The place has been shared for a very long time, worn evenly by both.",
    "friend": "The place is open and was chosen, not inherited.",
    "colleague": "The place is functional and not private; it belongs to no one.",
    "boss": "The place is not the viewer's own — the scale of it is set by someone else.",
    "family": "The place has been handed down and carries more than one generation.",
}

#: Die Jahreszeit der dichtesten Stelle.
#:
#: Billig zu haben und stark in der Wirkung: Wer weiß, dass es im Herbst dicht wurde, sieht
#: den Herbst — und erkennt SEINEN Verlauf, nicht irgendeinen.
JAHRESZEITEN: dict[int, str] = {
    12: "deep winter", 1: "deep winter", 2: "late winter",
    3: "early spring", 4: "spring", 5: "late spring",
    6: "early summer", 7: "high summer", 8: "late summer",
    9: "early autumn", 10: "autumn", 11: "late autumn",
}


# ── Archetypen, Tiere und Traumbilder ────────────────────────────────────────
#
# **Warum das dazugehoert und nicht Zierde ist.**
#
# Eine Schwelle, eine Bruecke, ein Schluessel, ein Tier am Rand — das sind Bilder, die
# Menschen seit jeher fuer innere Lagen benutzen, in Traeumen wie in der Arbeit mit Menschen.
# Sie sagen etwas, ohne es festzunageln, und genau das ist hier gebraucht: Ein Bild soll
# lesbar sein, ohne zu behaupten.
#
# **Jedes Symbol haengt an einer Groesse, die es im Fall wirklich gibt.** Eine Schwelle
# erscheint, wenn es einen Wunsch gibt, der fehlt; ein Uebergang, wenn ein Muster durchlaeuft.
# Ein Symbol, das ohne Anlass auftaucht, waere Dekoration — und schlimmer: eine Behauptung in
# Bildform.
#
# **Das Tier ist NIE die andere Person.** Ihr einen Wolf zuzuordnen waere eine
# Charakterisierung, und zwar die schlimmste Art: eine, die sich nicht widersprechen laesst.
# Das Tier ist Atmosphaere und Gegenwart, es steht am Rand und ist nicht bedrohlich. Die
# andere Person bleibt Wetter, Masse, Zug von einer Seite — in jeder Bildwelt.

SYMBOLIK: dict[str, dict[str, str]] = {'landschaft': {'schwelle': 'a lone doorframe standing free in the open ground, nothing built around it, the same land visible through it',
     'tier': 'a single deer standing far off near the edge of the scene, aware but not startled',
     'zeichen': 'an old lantern left standing on a flat stone beside the path, unlit',
     'uebergang': 'a narrow footbridge over a dry gully, its far end in shadow'}, 'wasser': {'schwelle': 'a stone step descending into the water and disappearing below the surface',
     'tier': 'a single heron standing motionless in the shallows at a distance',
     'zeichen': 'a small wooden boat drifting untethered, empty',
     'uebergang': 'a line of stepping stones crossing the water, one of them missing'}, 'haus': {'schwelle': 'a door standing open onto the next room, the light beyond it different from the light here',
     'tier': 'a cat sitting in a far doorway, turned away',
     'zeichen': 'a key lying on a bare windowsill',
     'uebergang': 'a narrow staircase leading up out of sight'}, 'wald': {'schwelle': 'two close-standing trunks forming a natural gateway onto a clearing',
     'tier': 'a single fox at the far edge of the clearing, half turned away',
     'zeichen': 'a knotted rope hanging from a low branch, old and weathered',
     'uebergang': 'a fallen trunk laid across a stream as a crossing'}, 'himmel': {'schwelle': 'a gap torn in the cloud with clear depth beyond it',
     'tier': 'a single bird very high up, small and far away',
     'zeichen': 'a kite string running up out of the frame, the kite itself unseen',
     'uebergang': 'a thin bright band where two weather systems meet'}, 'faden': {'schwelle': 'an opening in the weave with the structure changing on the other side',
     'tier': 'a moth resting on the fabric, wings closed',
     'zeichen': 'a needle left stuck in the cloth, its thread trailing',
     'uebergang': 'a seam joining two very different weaves'}}


#: Wie deutlich die Symbolik wird.
SYMBOLIK_STUFEN: tuple[dict[str, str], ...] = (
    {"key": "keine", "label": "Keine",
     "hinweis": "Nur der Ort selbst \u2014 kein Gegenstand, kein Tier."},
    {"key": "zurueckhaltend", "label": "Zur\u00fcckhaltend",
     "hinweis": "Ein Zeichen, kaum bemerkbar."},
    {"key": "deutlich", "label": "Deutlich",
     "hinweis": "Schwelle, \u00dcbergang, ein Tier \u2014 deutlich zu sehen."},
)

SYMBOLIK_SCHLUESSEL = {s["key"] for s in SYMBOLIK_STUFEN}
STANDARD_SYMBOLIK = "zurueckhaltend"


# ── Was im Bild wie schwer wiegt ─────────────────────────────────────────────
#
# **Hier standen Ankreuzfelder: an oder aus.** Das war zu grob für die Frage, die jemand an
# sein Bild hat. „Meine Szenen sollen vorkommen, aber worum es wirklich geht, sind die
# Muster" ist mit zwei Häkchen nicht sagbar.
#
# Die Stufen steuern ZWEI Dinge auf einmal, und das ist der Grund, warum sie eine Stufe sind
# und keine Zahl: Sie entscheiden, **was überhaupt geladen wird** (``aus`` heißt: nicht
# abfragen, nicht in den Prompt, nicht ins Modell), und sie gehen als **Wort** mit. „Szenen:
# 0.8" ist für ein Modell bedeutungslos; „darum geht es hier vor allem" ist eine Anweisung.
# Dieselbe Bauart wie die Gewichte des Podcast-Studios, und aus demselben Grund.

GEWICHTE_STUFEN: tuple[dict[str, str], ...] = (
    {"key": "aus", "label": "Aus",
     "hinweis": "Kommt nicht vor und wird nicht geladen.",
     "prompt": ""},
    {"key": "wenig", "label": "Am Rand",
     "hinweis": "Klingt mit, trägt aber nicht.",
     "prompt": "present only at the edge of the image"},
    {"key": "normal", "label": "Normal",
     "hinweis": "Einer von mehreren Trägern.",
     "prompt": "one of the things this image is built from"},
    {"key": "viel", "label": "Darum geht es",
     "hinweis": "Bestimmt, was man zuerst sieht.",
     "prompt": "THIS is what the image is mainly about — it decides the subject and what the "
               "viewer sees first"},
)
GEWICHTE_SCHLUESSEL = {g["key"] for g in GEWICHTE_STUFEN}
STANDARD_GEWICHT = "normal"

#: Die Elemente, die ein Gewicht bekommen — und die Schicht, die daran hängt.
#:
#: **Eins zu eins auf die alten Schichten.** Ein Gewicht über ``aus`` schaltet dieselbe Schicht
#: ein, die vorher ein Häkchen einschaltete; der gerechnete Weg und der Katalog arbeiten
#: unverändert weiter. Zwei Regler über dieselbe Sache wären einer zu viel — das ist heute
#: schon zweimal passiert (eine Bildwelt ohne Wirkung, eine Symbolik-Stufe auf nur einem Weg).
ELEMENTE: tuple[dict[str, str], ...] = (
    {"key": "szenen", "label": "Deine Momente",
     "hinweis": "Was du festgehalten hast — die Orte, Dinge und Uhrzeiten daraus.",
     "prompt": "the concrete moments this person wrote down"},
    {"key": "gefuehl", "label": "Dein Gefühlsbild",
     "hinweis": "Wie es dir zuletzt ging. Wird Licht, Wetter und Luft.",
     "prompt": "how this person feels right now — it becomes light, weather and air"},
    {"key": "muster", "label": "Die Muster",
     "hinweis": "Was sich wiederholt. Wird die Form des Ortes.",
     "prompt": "what repeats in this relationship — it becomes the shape of the place"},
    {"key": "erkenntnisse", "label": "Deine Erkenntnisse",
     "hinweis": "Was du selbst verstanden hast. Das Einzige, was leuchtet.",
     "prompt": "what this person has understood by themselves — the only thing that glows"},
    {"key": "wuensche", "label": "Was du dir wünschst",
     "hinweis": "Aus deiner Traumbeziehung. Wird sichtbare Abwesenheit.",
     "prompt": "what this person wishes for and does not have — visible as absence"},
    {"key": "druck", "label": "Die andere Person",
     "hinweis": "Nie als Gestalt — als Kraft, Masse oder Richtung.",
     "prompt": "the other person as a force on the whole scene, never as a figure"},
)

#: Welche Schicht zu welchem Element gehört.
#:
#: Die Namen sind andere, weil die alten technisch waren: „grundton" sagt einem Menschen
#: nichts, „Dein Gefühlsbild" schon. Die Schichten darunter bleiben, wie sie sind.
ELEMENT_ZU_SCHICHT: dict[str, str] = {
    "szenen": "szenen",
    "gefuehl": "grundton",
    "muster": "durchgaenge",
    "erkenntnisse": "lichter",
    "wuensche": "leerstellen",
    "druck": "druck",
}


def schichten_aus_gewichten(gewichte: dict[str, str]) -> set[str]:
    """Die Schichten, die bei diesen Gewichten geladen werden.

    **Was auf ``aus`` steht, wird nicht geladen** — und was nicht geladen ist, kann auch nicht
    versehentlich in einen Prompt geraten. Das ist dieselbe Überlegung, aus der die Gewichte
    des Podcasts das Laden steuern und nicht bloß die Formulierung.
    """
    return {
        schicht for element, schicht in ELEMENT_ZU_SCHICHT.items()
        if str(gewichte.get(element) or STANDARD_GEWICHT) != "aus"
    }


def gewicht_marke(element: str, gewichte: dict[str, str]) -> str:
    """Das Gewicht eines Elements als Satz für das Modell — oder leer."""
    stufe = str(gewichte.get(element) or STANDARD_GEWICHT)
    eintrag = next((g for g in GEWICHTE_STUFEN if g["key"] == stufe), None)
    if not eintrag or not eintrag["prompt"]:
        return ""
    name = next((e["prompt"] for e in ELEMENTE if e["key"] == element), element)
    return f"{name}: {eintrag['prompt']}."


# ── Wie abstrakt ─────────────────────────────────────────────────────────────
#
# **Der Regler, der am meisten entscheidet.** Er sagt, ob jemand seinen Küchenstuhl sieht oder
# ein Feld aus Licht. Beides ist richtig — für verschiedene Menschen und für verschiedene Tage.
#
# Er wirkt auf BEIDEN Wegen. Ein Regler, der nur auf einem von zwei Wegen etwas tut, ist
# schlimmer als keiner; das ist hier heute schon zweimal vorgekommen.

ABSTRAKTION_STUFEN: tuple[dict[str, str], ...] = (
    {"key": "konkret", "label": "Konkret",
     "hinweis": "Dinge, die du wiedererkennst. Ein Stuhl ist ein Stuhl.",
     "prompt": "Render everything as a recognisable place with recognisable things in it. "
               "Objects keep their edges and their weight; a chair is a chair. Nothing "
               "dissolves into pattern.",
     "prompt_baukasten": "Everything is clearly rendered and recognisable, with firm edges."},
    {"key": "normal", "label": "Normal",
     "hinweis": "Erkennbare Dinge in einem Bild, das atmet.",
     "prompt": "Recognisable things, but painted rather than illustrated: edges soften where "
               "the light is weak, and some areas give way to atmosphere.",
     "prompt_baukasten": "Recognisable forms, softened where the light is weak."},
    {"key": "abstrakt", "label": "Abstrakt",
     "hinweis": "Form, Farbe und Licht. Dinge nur noch angedeutet.",
     "prompt": "Push this far toward abstraction: the named things must still be the source "
               "of the composition, but they appear as mass, direction, light and colour "
               "rather than as objects. At most one or two things stay legible; everything "
               "else becomes field, texture and tone. No illustration.",
     "prompt_baukasten": "Pushed far toward abstraction: mass, direction, light and colour "
                         "rather than objects. At most one or two forms stay legible."},
)
ABSTRAKTION_SCHLUESSEL = {a["key"] for a in ABSTRAKTION_STUFEN}
STANDARD_ABSTRAKTION = "normal"


# ── Stimmungen ───────────────────────────────────────────────────────────────
#
# **Das Gegenstück zum Gefühlsbild, und zwar absichtlich.** Das Gefühlsbild ist eine Angabe
# über den Zustand; eine Stimmung ist ein Wunsch an das Bild. „Mir geht es gerade dreckig" und
# „ich möchte heute ein weites Bild sehen" sind zwei verschiedene Sätze, und beide dürfen
# gleichzeitig wahr sein.
#
# Mehrfach wählbar, aber nicht beliebig: Über drei Stimmungen heben sich auf.

STIMMUNGEN: tuple[dict[str, str], ...] = (
    {"key": "still", "label": "Still",
     "prompt": "very quiet, almost nothing moving"},
    {"key": "weit", "label": "Weit",
     "prompt": "wide and open, with distance in every direction"},
    {"key": "eng", "label": "Eng",
     "prompt": "close and narrow, the edges pressing in"},
    {"key": "kalt", "label": "Kalt",
     "prompt": "cold, with hard thin light"},
    {"key": "warm", "label": "Warm",
     "prompt": "warm, with low golden light"},
    {"key": "aufgewuehlt", "label": "Aufgewühlt",
     "prompt": "turbulent, with weather and movement running through everything"},
    {"key": "zart", "label": "Zart",
     "prompt": "delicate and easily hurt, thin and translucent"},
    {"key": "hart", "label": "Hart",
     "prompt": "hard and unforgiving, with sharp surfaces"},
    {"key": "nachts", "label": "Nachts",
     "prompt": "deep night, lit only by what is inside the scene"},
    {"key": "morgen", "label": "Früh am Morgen",
     "prompt": "very early morning, before the day has started"},
    {"key": "nach_dem_regen", "label": "Nach dem Regen",
     "prompt": "just after rain, everything wet and holding light"},
    {"key": "aufbruch", "label": "Aufbruch",
     "prompt": "on the edge of leaving: something is about to move"},
    {"key": "halten", "label": "Haltend",
     "prompt": "something is being held and protected, carefully"},
    {"key": "schwer", "label": "Schwer",
     "prompt": "heavy, with weight pressing down from above"},
    {"key": "schwebend", "label": "Schwebend",
     "prompt": "weightless, as if nothing were quite touching the ground"},
)
STIMMUNG_SCHLUESSEL = {st["key"] for st in STIMMUNGEN}
MAX_STIMMUNGEN = 3


# ── Die Figur ────────────────────────────────────────────────────────────────
#
# **Genau EIN Gesicht, und es gehoert der Person selbst.**
#
# Die Linie hat sich zweimal verschoben, und jedes Mal auf Zuruf. Erst galt: hoechstens eine
# Gestalt, von hinten, nirgends ein Gesicht. Dann durfte ein Kind daneben stehen, um das sich
# jemand kuemmert. Jetzt duerfen andere Menschen vorkommen, und die Person selbst darf zu
# sehen sein.
#
# **Was das moeglich macht, ist nicht Nachlaessigkeit, sondern dass die Erscheinung erfunden
# ist.** Diese App hat kein Bild von niemandem. Aus der Selbstauskunft kommen Altersspanne und
# Geschlecht, alles Weitere denkt sich das Bildmodell aus — die Gestalt kann der Person also
# gar nicht aehneln. Entscheidend ist, dass das DASTEHT: an der Wahl, in der Legende und im
# Prompt. Eine erfundene Erscheinung, die als Abbild gelesen wird, waere schlimmer als keine.
#
# **Was bleibt: die Person, um die es im Fall geht, nie nah und nie mit Gesicht.** Ein
# Portraet von jemandem, der nie dafuer sass, laedt zum Wiedererkennen ein — mit allem, was
# daran haengt: Haltung, Groesse, Ausdruck. Fern, schemenhaft, von hinten ist erlaubt; ein
# Gesicht nicht. Und weil eine Bildregie nicht weiss, welcher beschriebene Mensch das ist,
# gilt die Entfernung fuer jeden, den sie beschreibt (`bild_regie.personen_zu_nah`).
#
# **Die Erscheinung kommt aus der Selbstauskunft und nur daraus.** Sie kennt Altersspanne und
# Geschlecht (letzteres freiwillig) — mehr nicht. Fuer eine Rueckenfigur in der Ferne reicht
# das; alles Weitere waere ausgedacht.

FIGUR_STUFEN: tuple[dict[str, str], ...] = (
    {"key": "keine", "label": "Niemand",
     "hinweis": "Der Ort ist leer — es kommt kein Mensch darin vor."},
    {"key": "ich", "label": "Ich, von hinten",
     "hinweis": "Eine Gestalt in der Ferne, abgewandt und ohne Gesicht."},
    {"key": "ich_sichtbar", "label": "Ich, zu sehen",
     "hinweis": "Eine Gestalt, die man ansehen kann. Ihr Aussehen ist frei erfunden."},
)

#: Die Stufen, bei denen eine eigene Gestalt im Bild steht.
#:
#: **Als Menge und nicht als vier Vergleiche mit „ich".** Vorher stand `figur == "ich"` an
#: vier Stellen — im Prompt, in beiden Legenden und im Router. Beim Dazukommen der dritten
#: Stufe hätte jede einzelne davon still die neue Wahl übersehen: Die Gestalt wäre im Prompt
#: erschienen und in der Legende nicht, oder umgekehrt.
MIT_GESTALT = frozenset({"ich", "ich_sichtbar"})


def zeigt_mich(einstellungen: dict[str, Any] | None) -> bool:
    """Ob die Person selbst im Bild vorkommt — in welcher der beiden Formen auch immer."""
    return str((einstellungen or {}).get("figur") or "") in MIT_GESTALT

FIGUR_SCHLUESSEL = {f["key"] for f in FIGUR_STUFEN}
STANDARD_FIGUR = "keine"


#: Was die Gestalt tut.
#:
#: **Eine Haltung ist eine Aussage — und sie kommt von der Person, nicht von uns.** Wer
#: „schützend" wählt, sagt etwas über seine Lage; würden WIR die Haltung aus den Daten
#: ableiten, wäre es eine Deutung in Bildform. Deshalb ist es eine Wahl und keine Rechnung.
#: Der Schlüssel, bei dem die Regie die Haltung wählt.
HALTUNG_AUS_FALL = "fall"

HALTUNGEN: tuple[dict[str, str], ...] = (
    # **Zuerst die Wahl, die nichts behauptet.**
    #
    # Hier stand: „Eine Haltung ist eine Aussage — und sie kommt von der Person. Würden WIR
    # sie aus den Daten ableiten, wäre es eine Deutung in Bildform." Das bleibt richtig, und
    # deshalb ist das Ableiten eine EIGENE Wahl und nicht die stille Vorgabe: Wer sie trifft,
    # hat selbst entschieden, dass der Fall das beantworten darf.
    #
    # Gewählt wird dann aus genau dieser Liste, nicht frei formuliert — die Regie sucht einen
    # Schlüssel aus, der hier steht. Dasselbe Verfahren wie bei den Musterbildern: Das Modell
    # wählt aus, was wir geschrieben haben.
    {"key": HALTUNG_AUS_FALL, "label": "Aus deinem Fall",
     "hinweis": "Das Bild entscheidet, was du darin tust.",
     "prompt": "", "prompt_sichtbar": ""},
    {"key": "stehend", "label": "Stehen",
     "hinweis": "Ruhig, in die Ferne sehend.",
     "prompt": "standing still, looking out into the distance",
     "prompt_sichtbar": "standing still, head turned slightly to look out across the scene"},
    {"key": "gehend", "label": "Gehen",
     "hinweis": "Unterwegs.",
     "prompt": "walking away from the viewer, further into the scene",
     # **Nicht „weg vom Betrachter".** Eine Gestalt, die man ansehen soll, kann nicht
     # gleichzeitig von hier weggehen - und genau so stand es einen Moment im Prompt, neben
     # „the face is visible". Ein Bildmodell loest so einen Widerspruch still auf, und dann
     # stimmt entweder die Haltung nicht oder das Gesicht fehlt.
     "prompt_sichtbar": "walking across the scene from one side, mid-stride, in profile"},
    {"key": "schuetzend", "label": "Schützen",
     "hinweis": "Zugewandt, schirmend — über jemanden oder etwas.",
     "prompt": "leaning protectively over what is beside them, sheltering it with their "
               "body and turned toward it",
     "prompt_sichtbar": "leaning protectively over what is beside them, sheltering it with "
                        "their body, their face turned down toward it"},
    {"key": "abgewandt", "label": "Abwenden",
     "hinweis": "Weg von dem, was drückt.",
     "prompt": "turned away from the side the weather comes from, shoulders raised",
     "prompt_sichtbar": "turned away from the side the weather comes from, shoulders raised, "
                        "face in three-quarter view away from it"},
    {"key": "wartend", "label": "Warten",
     "hinweis": "Stillstehend, ohne Richtung.",
     "prompt": "standing motionless with no direction of travel, as if waiting",
     "prompt_sichtbar": "standing motionless with no direction of travel, as if waiting, "
                        "looking at nothing in particular"},
)

HALTUNG_SCHLUESSEL = {h["key"] for h in HALTUNGEN}
STANDARD_HALTUNG = "stehend"


#: Wer sonst noch vorkommen darf.
#:
#: **Hier lag meine Regel zu grob.** „Keine zweite Gestalt" sollte EINE Person schützen: die
#: Fallperson. Ein Kind, um das sich jemand kümmert, ist etwas anderes — es gehört zum Leben
#: der Person, nicht zur Gegenseite, und wer sein Bild ohne das Kind sieht, sieht sein Leben
#: nicht.
#:
#: **Ein Kind erscheint nur, wenn beides stimmt:** Die Selbstauskunft nennt Kinder, UND der
#: Fall handelt nicht VON einem Kind. Geht es im Fall um das eigene Kind, wäre die Kindfigur
#: die Fallperson — und die wird nie eine Gestalt.
#: Wer sonst nah bei der eigenen Gestalt steht.
#:
#: **Hier standen „ein Kind" und „zwei Kinder".** Das war eine Liste, die nur raten konnte:
#: Wer sonst im Leben eines Menschen vorkommt, steht in seinem Fall und nicht in meinem
#: Katalog. Jetzt gibt es drei Antworten — niemand, der Fall entscheidet, oder die Person
#: sagt es selbst.
#:
#: **Der Freitext geht nie direkt an das Bildmodell**, sondern wird von der Bildregie gelesen,
#: die daraus eine englische Wendung macht. Dieselbe Zwischenstufe wie beim Wunsch, und sie
#: ist der Grund, warum es diesen Freitext überhaupt geben kann.
#:
#: **Ein Gesicht hat auch eine Begleitung nicht.** Nah stehen darf sie; genau EIN Gesicht ist
#: im Bild, und das ist das der Person selbst. Damit kann eine Begleitung nicht als die
#: Person gelesen werden, um die es im Fall geht.
BEGLEITUNGEN: tuple[dict[str, str], ...] = (
    {"key": "keine", "label": "Niemand sonst", "hinweis": "Nur du."},
    {"key": "fall", "label": "Aus deinem Fall",
     "hinweis": "Das Bild entscheidet, wer zu dir gehört."},
    {"key": "freitext", "label": "Ich sage es",
     "hinweis": "Schreib, wer bei dir sein soll."},
)

#: Wie eine Begleitung in den Prompt kommt — **der Rahmen gehört uns, der Inhalt dem Fall.**
#:
#: Ohne den Rahmen stünde dort eine Wendung ohne Regel, und ein Bildmodell macht daraus eine
#: zweite Hauptfigur mit Gesicht.
BEGLEITUNG_RAHMEN = (
    "Close beside the figure, belonging to it: {was}. Seen from behind or from the side, "
    "with no face visible and no facial features implied, smaller in the frame than the "
    "figure itself."
)

#: Höchstens so lang darf der Freitext zur Begleitung werden.
MAX_BEGLEITUNG_TEXT = 200

BEGLEITUNG_SCHLUESSEL = {b["key"] for b in BEGLEITUNGEN}

#: Die Haltungen, die eine Gestalt wirklich einnehmen kann (ohne „aus deinem Fall").
HALTUNGEN_ECHT = tuple(h for h in HALTUNGEN if h["key"] != HALTUNG_AUS_FALL)
HALTUNG_SCHLUESSEL_ECHT = {h["key"] for h in HALTUNGEN_ECHT}


def gestalt_wahl(
    einstellungen: dict[str, Any], regie: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Haltung und Begleitung, aufgelöst — **eine Quelle für Prompt UND Legende.**

    Beide können jetzt aus dem Fall kommen, und beide stehen danach an zwei Stellen: im
    Prompt und in der Erklärung daneben. Zwei Auflösungen würden irgendwann auseinanderlaufen,
    und dann erklärt die Legende eine Haltung, die im Bild nicht steht — derselbe Fehler, den
    `starke_muster` für die Muster verhindert.

    Ohne Regie (Weg „Baukasten") lässt sich „aus deinem Fall" nicht beantworten. Dann steht
    die Gestalt, und die Legende sagt genau das — statt still etwas anderes zu zeigen.
    """
    schluessel = str(einstellungen.get("haltung") or STANDARD_HALTUNG)
    aus_fall = schluessel == HALTUNG_AUS_FALL
    # **Geprüft wird die GÜLTIGKEIT, nicht die Anwesenheit.** Die erste Fassung fragte, ob
    # die Regie überhaupt etwas gesagt hat — und hätte „tanzend auf dem Tisch" als erfüllt
    # gezählt, obwohl die Gestalt dann steht. `pruefen` streicht einen unbekannten Schlüssel
    # schon vorher; dass es hier trotzdem nachgesehen wird, ist der Grund, warum die Legende
    # nicht lügen kann, wenn jemand diesen Weg einmal umgeht.
    taugt = str((regie or {}).get("haltung") or "") in HALTUNG_SCHLUESSEL_ECHT
    if aus_fall:
        schluessel = (
            str(regie["haltung"]) if taugt else STANDARD_HALTUNG  # type: ignore[index]
        )
    haltung = next(
        (h for h in HALTUNGEN_ECHT if h["key"] == schluessel), HALTUNGEN_ECHT[0])

    art = str(einstellungen.get("begleitung") or "keine")
    # Beide Wege gehen über die Regie: Der Freitext ist deutsch und wird von ihr übersetzt,
    # die Ableitung kommt von ihr sowieso. Ohne Regie gibt es keine Begleitung.
    was = str((regie or {}).get("begleitung") or "") if art in ("fall", "freitext") else ""

    return {
        "haltung": haltung,
        "haltung_aus_fall": aus_fall,
        "haltung_erfuellt": not aus_fall or taugt,
        "begleitung_art": art,
        "begleitung_was": was,
    }
STANDARD_BEGLEITUNG = "keine"

#: Bei diesen Angaben der Selbstauskunft gibt es Kinder im Leben der Person.
KINDER_ANGABEN = {"not_with_person", "shared", "indirectly_affected"}


def kinder_erlaubt(beziehungsart: str | None) -> bool:
    """Ob in diesem Fall überhaupt ein Kind im Bild vorkommen darf.

    **Die schärfste Regel des Moduls.** Handelt der Fall VON einem Kind, wäre die Kindfigur
    die Person, um die es geht — eine Abbildung eines echten Kindes aus den Angaben eines
    Elternteils. Das ist das Letzte, was hier entstehen darf.

    Bei ``co_parenting`` ist es dagegen der andere ELTERNTEIL, um den es geht: Dort gehören die
    Kinder ins Bild, weil sie der Grund für fast alles sind, was in so einem Fall steht.

    **Hier stand `begleitung_moeglich(selbst, beziehungsart)`** und fragte zusätzlich die
    Selbstauskunft: Nur wer dort Kinder angegeben hatte, durfte die Wahl „ein Kind" überhaupt
    sehen. Diese Wahl gibt es nicht mehr — wer dazugehört, sagt der Fall oder die Person
    selbst. Was bleibt, ist die eine Regel, und sie hängt an der Beziehungsart allein.
    """
    return str(beziehungsart or "") != "child"


def figur_beschreibung(
    selbst: dict[str, Any] | None, einstellungen: dict[str, Any] | None = None,
    regie: dict[str, Any] | None = None,
) -> str:
    """Die eigene Gestalt, aus der Selbstauskunft — in einer von zwei Formen.

    ``ich``            Von hinten, in der Ferne, ohne Gesicht.
    ``ich_sichtbar``   Nah genug, dass man sie ansehen kann, mit Gesicht.

    **Hier stand: „Eine erfundene Erscheinung wäre schlimmer als keine" — wer sich in einer
    Gestalt nicht wiedererkennt, liest das Bild als Aussage über jemand anderen.**

    Das stimmt für eine Erscheinung, die unausgesprochen bleibt. Es stimmt nicht mehr, wenn
    daneben steht, dass sie erfunden ist: Dann ist die Gestalt eine Figur und keine Behauptung
    über einen Körper. Genau deshalb ist der Satz „dein Aussehen ist frei erfunden" keine
    Fußnote, sondern die Bedingung, unter der es diese Stufe überhaupt gibt — er steht in der
    Oberfläche an der Wahl, in der Legende am Bild und hier im Prompt.

    Aus der Selbstauskunft kommen weiter nur Altersspanne und Geschlecht. Alles Weitere —
    Haare, Kleidung, Statur — erfindet das Bildmodell, und das ist gesagt.
    """
    teile: list[str] = []
    alter = (selbst or {}).get("age_range")
    geschlecht = (selbst or {}).get("gender")

    if geschlecht in ("weiblich", "female", "w"):
        wer = "a woman"
    elif geschlecht in ("maennlich", "m\u00e4nnlich", "male", "m"):
        wer = "a man"
    else:
        wer = "a single person, their build not clearly discernible"
    teile.append(wer)

    if isinstance(alter, str) and "-" in alter:
        try:
            von = int(alter.split("-")[0])
        except ValueError:
            von = 0
        # Die Schwellen liegen an den Spannen der Selbstauskunft (18-25, 26-35, 36-45,
        # 46-55, 56+) und nicht an runden Zahlen: „36-45" ist Lebensmitte und nicht mehr
        # jung, und eine Figur, in der sich jemand nicht wiedererkennt, ist schlimmer als
        # eine unbestimmte.
        if von >= 56:
            teile.append("older")
        elif von >= 36:
            teile.append("in middle life")
        elif von >= 26:
            teile.append("a younger adult")
        else:
            teile.append("young")

    wahl = gestalt_wahl(einstellungen or {}, regie)
    haltung = wahl["haltung"]

    sichtbar = str((einstellungen or {}).get("figur") or "") == "ich_sichtbar"
    if sichtbar:
        satz = (
            f"In the scene there is one adult figure, close enough to be seen clearly: "
            f"{', '.join(teile)}, {haltung['prompt_sichtbar']}. The figure is seen from the "
            "side or "
            "three-quarters, turned into the scene rather than toward the viewer, and the "
            "face is visible, calm and unremarkable. THE APPEARANCE IS INVENTED: hair, "
            "clothing and build are the painter's free choice within the age and gender "
            "given, and this is not a likeness of any real person. No portrait framing and "
            "no posing — the figure belongs to the place."
        )
    else:
        satz = (
            f"In the scene there is one adult figure, seen from a distance: "
            f"{', '.join(teile)}, {haltung['prompt']}. The figure is seen entirely from "
            "behind, small in the frame, and no facial features are visible or implied."
        )

    if wahl["begleitung_was"]:
        satz += " " + BEGLEITUNG_RAHMEN.format(was=wahl["begleitung_was"].rstrip("."))
    return satz


BILDWELT_SCHLUESSEL = {b["key"] for b in BILDWELTEN}
STANDARD_BILDWELT = "landschaft"


# ── Die Handschriften: wie gemalt wird ───────────────────────────────────────

HANDSCHRIFTEN: tuple[dict[str, Any], ...] = (
    {
        "key": "aquarell", "label": "Aquarell",
        "hinweis": "Nass, durchscheinend, mit weichen Rändern.",
        "prompt": "delicate watercolour painting on textured paper, translucent washes, "
                  "soft bleeding edges, visible paper grain, generous empty space",
    },
    {
        "key": "oel", "label": "Malerei",
        "hinweis": "Dicht aufgetragen, mit sichtbarem Pinsel.",
        "prompt": "oil painting with visible brushwork and impasto, muted layered colour, "
                  "soft atmospheric depth, in the spirit of quiet northern landscape painting",
    },
    {
        "key": "tusche", "label": "Tusche",
        "hinweis": "Wenige Striche, viel Weiß.",
        "prompt": "ink brush painting on pale paper, very few confident strokes, large areas "
                  "of untouched paper, restrained and spare",
    },
    {
        "key": "grafit", "label": "Grafit",
        "hinweis": "Grau in Grau, gerieben und gewischt.",
        "prompt": "graphite and charcoal drawing on rough paper, soft smudged tones, "
                  "visible hatching, no colour",
    },
    {
        "key": "kollage", "label": "Collage",
        "hinweis": "Gerissene Papiere, übereinandergelegt.",
        "prompt": "torn paper collage with layered fragments, visible ragged edges and "
                  "shadow gaps, aged papers in flat muted tones",
    },
    {
        "key": "linol", "label": "Druck",
        "hinweis": "Klare Flächen, wenige Farben.",
        "prompt": "hand-pulled linocut print, two or three flat ink colours, bold simplified "
                  "shapes, visible texture of the block and slight misregistration",
    },
)

HANDSCHRIFT_SCHLUESSEL = {h["key"] for h in HANDSCHRIFTEN}
STANDARD_HANDSCHRIFT = "aquarell"

#: Farbregister, in Worten statt Hexwerten — dieselben fünf Namen wie beim gerechneten Weg,
#: damit ein Mensch zwei Bilder vergleichen kann.
FARBWORTE: dict[str, str] = {
    "kuehl": "a cool restrained palette: slate blue, grey-green, pale stone, deep navy",
    "warm": "a warm earthen palette: ochre, terracotta, umber, aged cream",
    "erdig": "a muted natural palette: olive, clay, moss, bone, dust",
    "nacht": "a dark palette: deep blue-black with cold pale greys and one warm light",
    "schwarzweiss": "achromatic: black, white and greys only, no colour",
}


# ── Die Grenze ───────────────────────────────────────────────────────────────
#
# **Sie steht am Ende, wo ein Modell am stärksten gewichtet — und sie ist jetzt eng gefasst.**
#
# Verboten ist, was eine Behauptung über einen Menschen oder ein Geschehen wäre. Nicht
# verboten ist alles Gegenständliche: Ein Pfad, ein Fenster, Wetter sind Gleichnisse und keine
# Zeugen.

GRENZE = (
    "Important constraints:\n"
    "- At most ONE face may be visible anywhere in this image: that of the single figure "
    "described above as the viewer, and only if that description explicitly says the face is "
    "visible. Its appearance is invented and is not a likeness of anyone.\n"
    "- Other people may appear only where the description above puts them, and every one of "
    "them is far away, small in the frame, turned away, or an indistinct silhouette. No "
    "facial features on them, not even suggested or implied, no portrait of them, nobody "
    "among them turned toward the viewer. Where the description above mentions no people, "
    "there are none.\n"
    "- The person this image is about is never shown close and never with a face — at most a "
    "distant, indistinct shape, seen from behind.\n"
    "- No reflection and no shadow may show a face that the rules above do not allow.\n"
    "- Animals may appear as described above; they are calm and at a distance, never "
    "threatening, never menacing, never looking at the viewer.\n"
    "- No letters, numbers, words, writing, signatures, logos or frames.\n"
    "- Nothing violent or gory, no weapons, no blood, no restraints, no cages. Nothing "
    "frightening involving a child.\n"
    "- This is not an illustration of an event and not a scene from a story. It is a place "
    "that carries a mood.\n"
    "- It should feel true rather than impressive: not an advertisement, not a stock "
    "illustration, nothing staged. Within that, be as striking and as strange as the subject "
    "deserves."
)


def _jahreszeit() -> str:
    """Die Jahreszeit von HEUTE.

    **Hier stand erst die Jahreszeit der dichtesten Stelle — und das war falsch.**

    Wo sich Szenen häufen, sagt etwas darüber, wann jemand Zeit zum Schreiben hatte, nicht
    wann etwas passiert ist. Wer drei Wochen im Urlaub war, hat dort eine Lücke; wer die App
    gerade entdeckt hat, hat am Anfang eine Häufung. Ein Bild, das sich daran ändert, ändert
    sich aus dem falschen Grund.

    Was stimmt: Das Bild entsteht jetzt. Die Jahreszeit von heute erdet es im Gegenwärtigen
    und behauptet nichts über den Verlauf.
    """
    from datetime import date

    return JAHRESZEITEN[date.today().month]


def _satz(text: str) -> str:
    """Ein Satzteil aus dem Katalog wird ein Satz.

    Die Bausteine sind klein geschrieben, weil sie an verschiedenen Stellen eingesetzt werden
    — mitten in einem Satz und an seinem Anfang. Wer sie schon gross hinterlegt, bekommt
    Grossbuchstaben mitten im Satz.
    """
    text = text.strip().rstrip(".")
    if not text:
        return ""
    return text[0].upper() + text[1:] + "."


#: Ab wann ein Muster stark genug ist, um ein Bild zu tragen.
SCHWELLE_MUSTER = 0.45


def starke_muster(
    werte: dict[str, Any], schichten: set[str],
) -> list[tuple[str, float]]:
    """Die Muster, die das Bild tragen — stärkstes zuerst, als (Schlüssel, Wert).

    **Eine Quelle für den Prompt UND für die Legende.**

    Rechnete die Legende ihre eigene Reihenfolge aus, könnte sie ein Muster nennen, das im
    Bild gar nicht führt — und dann sucht die Person im Bild etwas, das nicht da ist. Genau
    das ist der Grund, warum diese Auswahl an einer Stelle steht und nicht an zwei.

    Charakterwerte sind hier nie dabei: Sie haben keinen Eintrag in `MUSTER_BILDER`, und der
    Filter läuft über diesen Eintrag, nicht über eine Liste von Ausnahmen.
    """
    if "durchgaenge" not in schichten:
        return []
    passend = [
        d for d in (werte.get("durchgaenge") or [])
        if float(d.get("wert") or 0) > SCHWELLE_MUSTER
        and str(d.get("key")) in MUSTER_BILDER
    ]
    return [
        (str(d["key"]), float(d["wert"]))
        for d in sorted(passend, key=lambda d: -float(d["wert"]))
    ]


def fuehrendes_muster(werte: dict[str, Any], schichten: set[str]) -> str | None:
    """Das Muster, aus dem das Leitbild entsteht — oder nichts."""
    stark = starke_muster(werte, schichten)
    return stark[0][0] if stark else None


#: Anläufe, die ein Modell einem Satz voranstellt, obwohl ein Satzteil gefragt war.
#:
#: Alle aus echten Antworten, nicht gesammelt auf Verdacht. Ein Modell ist darauf trainiert,
#: in ganzen Sätzen zu reden, und das Feld hat es nach einem Satzteil gefragt.
_ANLAEUFE = (
    "this is ", "it is ", "the image is ", "the scene is ", "we see ", "we are looking at ",
    "seen is ", "there is ", "an image of ", "a picture of ", "a view of ",
    # Beim Wagnis sagt es gern erst, DASS es eine Entscheidung ist, und dann welche.
    "the bold decision is that ", "the bold decision is ", "the one bold decision is that ",
    "the one bold decision is ", "the break with realism is that ",
    "the break with realism is ", "the deliberate break is that ", "my bold decision is ",
)


def _einfuegbar(satz: str) -> str:
    """Ein Feld der Regie, das mitten in einen Satz gesetzt wird.

    **Ohne das steht im Prompt „It is set in This is inside an old house".** Das Modell
    antwortet mit vollständigen Sätzen, auch wenn nach einem Satzteil gefragt war — es ist
    darauf trainiert, in Sätzen zu reden, und keine Bitte hält das zuverlässig auf.

    Ein Bildmodell stolpert darüber nicht sichtbar, es verteilt nur seine Aufmerksamkeit
    anders. Gerade darum wird es hier geradegezogen und nicht per Anweisung erbeten.
    """
    text = satz.strip().rstrip(".").strip()
    tief = text.lower()
    for anlauf in _ANLAEUFE:
        if tief.startswith(anlauf):
            text = text[len(anlauf):].strip()
            break
    return (text[0].lower() + text[1:]) if text else text


def _regie_teile(
    regie: dict[str, Any], farbe: str, einstellungen: dict[str, Any],
) -> list[str]:
    """Der Bildauftrag, den ein Sprachmodell aus dem Fall geschrieben hat, als Prompt.

    **Hier steht auffallend wenig.** Das ist die Absicht: Der Katalog darunter hat sechs
    Bildwelten, sieben Musterbilder und drei Stufen je Achse — und zwei ganz verschiedene
    Fälle unterschieden sich darin in zwei von 22 Zeilen. Ein Katalog kann Individualität
    sortieren, nicht erzeugen. Was ein Bild unverwechselbar macht, sind die Gegenstände, die
    diese Person selbst erzählt hat, und die stehen in der Regie.

    Von den Einstellungen bleiben die, die eine WAHL sind — Handschrift, Palette, wie deutlich
    Sinnbilder sein dürfen, ob eine Gestalt vorkommt. Die abgeleiteten Schichten treten
    zurück: Sie würden das Bild wieder in die Mitte ziehen, aus der es gerade herauskommt.
    """
    # **„Setting:" und nicht „It is set in".**
    #
    # Im Betrieb stand im Prompt „It is set in in a flat open landscape": Das Modell hatte
    # „In a flat open landscape …" geschrieben, und meine Vorlage brachte die Präposition
    # schon mit. Dasselbe wäre mit „inside an old house" passiert. Eine Vorlage, die keine
    # Präposition stellt, nimmt jede Form an, die ein Modell liefert — statt zu hoffen, dass
    # es die eine trifft, die hineinpasst.
    teile = [
        # **Keine Kopula in der Vorlage, aus demselben Grund wie die fehlende Praeposition
        # darunter.** Das Modell schrieb "A locked apartment door stands alone in a field",
        # und daraus wurde "The subject is a locked apartment door stands alone". Eine
        # Vorlage, die nur benennt, nimmt jede Form an.
        f"A single image. Subject: {_einfuegbar(regie['motiv'])}.",
        f"Setting: {_einfuegbar(regie['ort'])}. Colour: {farbe}.",
    ]

    dinge = [g["was"].rstrip(".") for g in regie.get("gegenstaende") or [] if g.get("was")]
    if dinge:
        teile.append("Also in the image: " + "; ".join(dinge) + ".")

    # Die Sinnbilder gehen ueber denselben Regler wie die des Katalogs: Wer „keine" gewaehlt
    # hat, hat das fuer sein Bild gewaehlt und nicht fuer eine Bauart darunter.
    stufe = str(einstellungen.get("symbolik") or STANDARD_SYMBOLIK)
    zeichen = [z["was"].rstrip(".") for z in regie.get("symbole") or [] if z.get("was")]
    if stufe != "keine" and zeichen:
        teile.append(
            "Somewhere in the scene: "
            + "; ".join(zeichen if stufe == "deutlich" else zeichen[:1]) + ".")

    if regie.get("licht"):
        teile.append(_satz(regie["licht"]))

    # **Das Wagnis kommt zuletzt und allein.**
    #
    # Es ist die eine Entscheidung, die ein vorsichtiger Illustrator nicht treffen würde —
    # Wasser auf dem Küchenboden, eine Tür im offenen Feld, ein Gegenstand unmöglich groß.
    # Mitten in einer Aufzählung ginge sie unter; am Ende, mit eigenem Vorspann, liest ein
    # Bildmodell sie als Auftrag.
    if regie.get("wagnis"):
        teile.append(
            "One deliberate break with realism, and only this one: "
            + _einfuegbar(regie["wagnis"]) + ".")
    return teile


def prompt_bauen(
    werte: dict[str, Any], einstellungen: dict[str, Any],
    regie: dict[str, Any] | None = None,
) -> str:
    """Aus Zahlen wird ein Gleichnis.

    **Ein Leitbild, dann Stützen, dann Atmosphäre — und nicht alles auf einmal.**

    Die erste Fassung hängte acht bis zehn gleichrangige Sätze aneinander, und genau so sahen
    die Bilder aus: voll und ohne Mitte. Ein Bildmodell folgt dem, was am Anfang steht, und
    baut alles Weitere darum herum. Dicht in Bedeutung heißt nicht voll.

    **Das Leitbild kommt aus dem stärksten Muster des Falls.** Das ist die Stelle, an der ein
    Mensch seinen eigenen Fall wiedererkennt: nicht an der Zahl der Momente, sondern daran,
    WAS sich wiederholt. Gibt es kein starkes Muster, führt die Zeitgestalt.

    **Zwei Wege, und der Aufrufer entscheidet.** Mit `regie` führt ein Bildauftrag, den ein
    Sprachmodell aus dem Fall geschrieben hat; die abgeleiteten Schichten treten dann zurück
    (siehe `_regie_teile`). Ohne `regie` baut der Katalog, wie bisher — dann gehen kein
    Szenentext, kein Skalenname und kein Satz der Person hinaus, sondern nur Zahlen, und die
    Skala wählt ein Bild aus, das hier steht.

    Die GRENZE gilt auf beiden Wegen, unverändert und zuletzt.
    """
    welt = next(
        (b for b in BILDWELTEN if b["key"] == einstellungen.get("bildwelt")), BILDWELTEN[0])
    hand = next(
        (h for h in HANDSCHRIFTEN if h["key"] == einstellungen.get("handschrift")),
        HANDSCHRIFTEN[0])
    farbe = FARBWORTE.get(str(einstellungen.get("palette")), FARBWORTE["kuehl"])
    schichten = set(einstellungen.get("schichten") or [])
    szenen = werte.get("szenen") or []

    teile: list[str] = [_satz(hand["prompt"])]

    if regie:
        teile += _regie_teile(regie, farbe, einstellungen)
    else:
        # ── Die Muster, stärkstes zuerst ────────────────────────────────────────
        #
        # Die Auswahl steht in `starke_muster` und nicht hier: Die Legende braucht dieselbe
        # Reihenfolge, und zwei Rechnungen driften irgendwann auseinander.
        muster = [
            bild for bild in (
                muster_bild(key, welt["key"]) for key, _ in starke_muster(werte, schichten)
            ) if bild
        ]

        # ── Keine Menge, kein Rhythmus ──────────────────────────────────────────
        #
        # **Hier stand die Dichte der Szenen und ihre Häufungen — beides ist draußen.**
        #
        # Wie viele Momente jemand festgehalten hat und wo Lücken sind, sagt etwas darüber, wie
        # lange und wie fleißig er die App benutzt. Wer sie seit zwei Jahren führt, bekäme ein
        # dichtes Bild; wer drei Wochen im Urlaub war, eine Lücke. Beides ist kein Grund, ein
        # Bild anders aussehen zu lassen.
        #
        # Was bleibt, hängt nicht an der Menge: die Muster (Skalenwerte, gegen den Fall
        # normalisiert), das Gefühlsbild, die DURCHSCHNITTLICHE Schwere der Momente und die
        # Wünsche. Alles davon wäre bei acht wie bei achtzig Szenen dasselbe.

        # ── Satz 1: das Leitbild ────────────────────────────────────────────────
        leit = muster[0] if muster else welt["szene"]
        teile.append(f"A single quiet image. The subject is {leit.rstrip('.')}.")
        teile.append(f"It is set in {welt['szene'].rstrip('.')}. Colour: {farbe}.")

        ton = BEZIEHUNGSTON.get(str(werte.get("beziehungsart") or ""))
        if ton:
            teile.append(ton)

        # ── Die Stützen: höchstens zwei weitere Muster ──────────────────────────
        #
        # Mehr macht das Bild voll, nicht dicht. Was nicht ins Bild passt, steht in der Legende.
        for weiteres in muster[1:3]:
            teile.append(f"Also present: {weiteres.rstrip('.')}.")

        # **Kein zweiter Weg ins Bild.** Fuehrt schon ein Muster, waere die Zeitgestalt ein
        # zweiter Gegenstand derselben Art — in der Landschaft zwei Pfade, im Haus zwei Gaenge.
        # Die Dichte traegt dann die Ballung, und die Zahl steht in der Legende.
        # **Ohne Musterbild traegt der allgemeine Durchgang die Schicht.**
        #
        # Sonst faellt eine eingeschaltete Schicht still aus: Wer nur Charakterwerte hoch hat
        # (die absichtlich kein Bild bekommen) oder nur mittlere Werte, saehe im Bild gar nichts
        # von seinen Mustern — und koennte sich das nicht erklaeren. Der allgemeine Durchgang
        # sagt „etwas laeuft durch alles hindurch", ohne zu sagen, was.
        if not muster and "durchgaenge" in schichten and any(
                float(d.get("wert") or 0) > 0.25 and str(d.get("key")) in MUSTER_BILDER
                for d in (werte.get("durchgaenge") or [])):
            teile.append(_satz(
                welt["faden"] + " — present everywhere rather than in one spot"))

        # **Der Durchschnitt, nicht die Summe.** Wie schwer die festgehaltenen Momente im Mittel
        # waren, ist bei acht wie bei achtzig Szenen dieselbe Aussage — ihre ZAHL wäre es nicht.
        if "szenen" in schichten and szenen:
            haerte = sum(float(s.get("haerte") or 0.5) for s in szenen) / len(szenen)
            teile.append(
                "The surfaces are " + welt["textur"][_stufe(haerte, "weich", "mittel", "hart")]
                + ".")

        # ── Atmosphäre: Licht, Bewegung, Jahreszeit ─────────────────────────────
        if "grundton" in schichten and werte.get("grundton"):
            g = werte["grundton"]
            teile.append(
                _stufe(float(g.get("temperatur") or 0.5),
                       "Cold hard light", "Even overcast light", "Low warm light")
                + ", "
                + _stufe(float(g.get("unruhe") or 0.5),
                         "the air completely still",
                         "a light wind moving through",
                         "wind driving hard through the whole scene")
                + "."
            )
        teile.append(f"The season is {_jahreszeit()}.")

        # ── Was leuchtet und was fehlt ──────────────────────────────────────────
        if "lichter" in schichten and (werte.get("lichter") or []):
            teile.append(_satz(
                welt["licht"] + " — the only bright things in the image, and nothing else "
                "competes with them"))
        if "leerstellen" in schichten and (werte.get("leerstellen") or []):
            anzahl = len(werte["leerstellen"])
            teile.append(_satz(
                welt["leere"]
                + f" — {_menge(anzahl, 'one or two', 'several', 'several')}, clearly absent "
                "rather than hidden"))
        if "druck" in schichten and werte.get("druck") is not None:
            teile.append(_satz(welt["druck"]))

        # ── Sinnbilder ──────────────────────────────────────────────────────────
        stufe = str(einstellungen.get("symbolik") or STANDARD_SYMBOLIK)
        sym = SYMBOLIK.get(welt["key"], {})
        if stufe != "keine" and sym:
            zeichen: list[str] = []
            if "leerstellen" in schichten and (werte.get("leerstellen") or []):
                zeichen.append(sym["schwelle"])
            if stufe == "deutlich":
                # Der Uebergang nur, wenn kein Muster fuehrt: Sonst stehen zwei Gegenstaende
                # derselben Art im Bild, und das sieht nach Fehler aus.
                # Der Uebergang nur, wenn kein Muster fuehrt: Sonst stehen zwei Gegenstaende
                # derselben Art im Bild.
                if not muster and "durchgaenge" in schichten and any(
                        float(d.get("wert") or 0) > 0.25
                        for d in (werte.get("durchgaenge") or [])):
                    zeichen.append(sym["uebergang"])
                zeichen.append(sym["tier"])
                if "lichter" in schichten and (werte.get("lichter") or []):
                    zeichen.append(sym["zeichen"])
            if zeichen:
                teile.append("Somewhere in the scene: " + "; ".join(zeichen) + ".")

    if zeigt_mich(einstellungen):
        teile.append(figur_beschreibung(
            einstellungen.get("selbst"), einstellungen, regie))
    else:
        # **„Niemand" muss gesagt werden, seit andere Menschen vorkommen dürfen.**
        #
        # Solange die Grenze jede Gestalt verbot, war die leere Wahl der Normalfall und
        # brauchte keinen Satz. Jetzt erlaubt die Grenze Menschen „where the description
        # above puts them" — ohne diesen Satz wäre „Niemand" nur noch das Fehlen einer
        # Erwähnung, und ein Bildmodell füllt eine leere Stelle gern mit einer Gestalt.
        teile.append(
            "There are no people anywhere in this image, and nothing that implies one: no "
            "figure, no silhouette, no shadow of a person, no reflection of one.")

    # ── Stimmungen ──────────────────────────────────────────────────────────
    #
    # **Das Gegenstück zum Gefühlsbild.** Das eine ist eine Angabe über den Zustand, das
    # andere ein Wunsch an das Bild — „mir geht es dreckig" und „ich möchte heute ein weites
    # Bild sehen" dürfen gleichzeitig wahr sein. Deshalb steht es NACH dem Licht aus dem
    # Gefühlsbild: Was die Person für dieses Bild will, hat das letzte Wort.
    gewaehlt = [
        st["prompt"] for st in STIMMUNGEN
        if st["key"] in set(einstellungen.get("stimmungen") or [])
    ][:MAX_STIMMUNGEN]
    if gewaehlt:
        teile.append("The whole image is " + ", and ".join(gewaehlt) + ".")

    # ── Wie abstrakt ────────────────────────────────────────────────────────
    #
    # Vor der Komposition und nach allem Inhalt: Es ist eine Anweisung über die ganze Fläche,
    # und sie gilt auf beiden Wegen — ein Regler, der nur bei der Regie etwas tut, wäre der
    # dritte Schalter dieser Woche ohne Wirkung auf einem von zwei Wegen.
    stufe_abs = next(
        (a for a in ABSTRAKTION_STUFEN
         if a["key"] == str(einstellungen.get("abstraktion") or STANDARD_ABSTRAKTION)),
        None)
    if stufe_abs:
        teile.append(stufe_abs["prompt"] if regie else stufe_abs["prompt_baukasten"])

    # ── Komposition ─────────────────────────────────────────────────────────
    #
    # **Ohne diesen Absatz wird aus einer guten Aufzählung ein schlechtes Bild.** Ein Modell
    # verteilt sonst alles gleichmäßig über die Fläche; was fehlt, ist eine Mitte, Tiefe und
    # Luft. Das ist der Unterschied zwischen einem Wimmelbild und einem, das man ansehen mag.
    if regie and regie.get("komposition"):
        # **Die Handwerksregeln bleiben, die Gestaltung geht an die Regie.** Tiefe und eine
        # Lichtrichtung sind das, was ein Bildmodell ohne Ansage vergisst; wo die Mitte liegt
        # und wieviel leer bleibt, hat die Regie am Fall entschieden und nicht ich.
        teile.append(
            "Composition: " + regie["komposition"].rstrip(".")
            + ". Foreground, middle distance and far distance readable as separate depths. "
            "The light comes from one direction only.")
    else:
        teile.append(
            "Composition: one clear focal point, with foreground, middle distance and far "
            "distance readable as separate depths. Generous empty space. The light comes "
            "from one direction only. Nothing is centred exactly. It should look like one "
            "place seen at one moment, not a collection of things."
        )
    teile.append(GRENZE)
    return "\n".join(teile)


def _regie_legende(
    regie: dict[str, Any], einstellungen: dict[str, Any],
) -> list[dict[str, str]]:
    """Die Legende zu einem Bild, das aus dem Fall entstanden ist.

    **Hier ist sie das Beste, was das ganze Modul zu bieten hat.** Beim Katalog musste die
    Legende erklären, wofür eine Metapher steht, die ich erfunden habe. Hier steht neben jedem
    Gegenstand, woher er kommt — aus welcher Stelle des eigenen Falls. Genau daran erkennt ein
    Mensch sein Bild wieder, und diese Zeilen kann kein Katalog schreiben.

    **Ohne den deutschen Namen fällt ein Gegenstand aus der Legende, nicht aus dem Bild.**
    Umgekehrt wäre es falsch: Das Bild ist die Hauptsache.
    """
    zeilen: list[dict[str, str]] = []
    stufe = str(einstellungen.get("symbolik") or STANDARD_SYMBOLIK)

    for gegenstand in regie.get("gegenstaende") or []:
        if gegenstand.get("zeigt"):
            zeilen.append({
                "was": gegenstand["zeigt"],
                "wofuer": gegenstand.get("woher")
                          or "ein Gegenstand aus dem, was du festgehalten hast",
            })

    if stufe != "keine":
        # Genau die Sinnbilder, die auch im Prompt standen — sonst sucht die Person eines,
        # das nicht da ist. Die Auswahl ist dieselbe wie in `_regie_teile`.
        symbole = [z for z in (regie.get("symbole") or []) if z.get("zeigt")]
        for zeichen in (symbole if stufe == "deutlich" else symbole[:1]):
            zeilen.append({
                "was": zeichen["zeigt"],
                "wofuer": (zeichen.get("woher") or "ein Sinnbild")
                          + " — was es dir bedeutet, entscheidest du",
            })

    gewaehlt = [st["label"] for st in STIMMUNGEN
                if st["key"] in set(einstellungen.get("stimmungen") or [])]
    if gewaehlt:
        zeilen.append({
            "was": "Die Stimmung, die du gewählt hast",
            "wofuer": ", ".join(gewaehlt[:MAX_STIMMUNGEN])
                      + " — das hast du für dieses Bild gewollt, unabhängig davon, wie es "
                        "dir gerade geht",
        })

    stufe_abs = next(
        (a for a in ABSTRAKTION_STUFEN
         if a["key"] == str(einstellungen.get("abstraktion") or STANDARD_ABSTRAKTION)), None)
    if stufe_abs and stufe_abs["key"] != STANDARD_ABSTRAKTION:
        zeilen.append({
            "was": f"Gemalt: {stufe_abs['label']}",
            "wofuer": stufe_abs["hinweis"].rstrip("."),
        })

    zeilen.append({
        "was": "Warum dieses Bild so aussieht",
        "wofuer": "Es ist nicht aus einer Vorlage entstanden, sondern aus deinem Fall: Ort, "
                  "Licht und Gegenstände kommen aus dem, was du selbst erzählt hast. Ein "
                  "zweites Bild zu denselben Angaben sieht deshalb wieder anders aus",
    })
    if zeigt_mich(einstellungen):
        zeilen.append(_gestalt_zeile(einstellungen, regie))
    return zeilen


def _gestalt_zeile(
    einstellungen: dict[str, Any], regie: dict[str, Any] | None = None,
) -> dict[str, str]:
    """Wer im Bild ist, wie er dasteht, und wer ausdrücklich nicht.

    Aufgelöst über `gestalt_wahl`, damit hier nie etwas anderes steht als im Prompt.
    """
    wahl = gestalt_wahl(einstellungen, regie)
    sichtbar = str(einstellungen.get("figur") or "") == "ich_sichtbar"
    haltung = wahl["haltung"]["label"].lower()

    was = "Die Gestalt" if sichtbar else "Die Gestalt von hinten"
    if wahl["begleitung_was"]:
        was += " und wer bei dir ist"

    teile: list[str] = [f"Du beim {haltung.capitalize()}"]
    if wahl["haltung_aus_fall"]:
        teile[0] += " — das hat dein Fall entschieden, nicht du"
    elif not wahl["haltung_erfuellt"]:  # pragma: no cover — nur mit „fall" erreichbar
        teile[0] += " — aus deinem Fall ließ sich das diesmal nicht ableiten"

    if wahl["begleitung_was"]:
        teile.append(
            "Neben dir steht, was du angegeben hast, wenn du es gesagt hast — und sonst, "
            "was aus deinem Fall dazugehört. Ohne Gesicht, wie alle außer dir"
        )
    elif wahl["begleitung_art"] in ("fall", "freitext"):
        # **Eine Wahl, die nicht erfuellt wurde, wird gesagt.** Sonst sucht die Person eine
        # Begleitung, die nicht im Bild ist, und haelt das Werkzeug fuer kaputt.
        teile.append(
            "Du wolltest jemanden neben dir — dafür ließ sich diesmal nichts finden, das "
            "durch die Prüfung kam. Versuch es noch einmal"
        )

    if sichtbar:
        teile.append(
            "**Dein Aussehen ist frei erfunden** — aus deiner Selbstauskunft kommen nur "
            "Altersspanne und Geschlecht, alles Weitere hat das Bildmodell sich ausgedacht. "
            "Es ist kein Abbild von dir"
        )
    else:
        teile.append("nach deiner Selbstauskunft, ohne Gesicht und in Entfernung")

    teile.append(
        "Die Person, um die es in diesem Fall geht, kommt nie mit Gesicht vor und nie nah"
    )
    return {"was": was, "wofuer": ". ".join(teile)}


def legende(
    einstellungen: dict[str, Any], werte: dict[str, Any],
    regie: dict[str, Any] | None = None,
) -> list[dict[str, str]]:
    """Was im Bild wofür steht — **und ohne das ist das Bild bloß hübsch.**

    Eine Metapher, die niemand auflöst, bleibt Dekoration. Die Legende nennt für jede
    eingeschaltete Schicht, welches Element des Bildes daraus entstanden ist. Sie ist keine
    Deutung: Sie sagt „die Lichter sind deine Erkenntnisse", nicht „du hast viel verstanden".

    Mit `regie` erklärt sie ein Bild, das aus dem Fall entstanden ist — dann stehen die
    Gegenstände darin und woher sie kommen (siehe `_regie_legende`).
    """
    if regie:
        return _regie_legende(regie, einstellungen)

    welt = next(
        (b for b in BILDWELTEN if b["key"] == einstellungen.get("bildwelt")), BILDWELTEN[0])
    schichten = set(einstellungen.get("schichten") or [])
    zeilen: list[dict[str, str]] = []

    # **Das Leitbild zuerst — es traegt das Bild.**
    #
    # Und es nennt den GEGENSTAND, nicht die Deutung. „Dein staerkstes Muster: Schuld, die bei
    # dir landet" liess die Person ratlos vor ihrem eigenen Bild stehen: Sie erfuhr, was
    # gemeint ist, und nicht, woran sie es erkennt. Jetzt steht beides da, und in dieser
    # Reihenfolge — erst das Sichtbare, dann sein Grund.
    stark = starke_muster(werte, schichten)
    fuehrend = stark[0][0] if stark else None

    if fuehrend:
        gemalt = muster_deutsch(fuehrend, welt["key"])
        name = MUSTER_LABEL.get(fuehrend, fuehrend)
        zeilen.append({
            "was": gemalt[0] if gemalt else "Das Hauptmotiv",
            "wofuer": (
                (gemalt[1] + ". " if gemalt else "")
                + f"Das ist dein stärkstes Muster: {name} ({_von_hundert(stark[0][1])})"
            ),
        })
        # Die Stuetzen genauso: Gegenstand und Wert, damit niemand im Bild nach einem Wort
        # sucht. Mehr als zwei stehen nicht im Bild, also nennt die Legende auch nur zwei.
        weitere = []
        for key, wert in stark[1:3]:
            dazu = muster_deutsch(key, welt["key"])
            if dazu:
                weitere.append(
                    f"{dazu[0]} — {MUSTER_LABEL.get(key, key)} ({_von_hundert(wert)})")
        if weitere:
            zeilen.append({
                "was": "Was noch im Bild steht",
                "wofuer": " · ".join(weitere),
            })

    if "szenen" in schichten and (werte.get("szenen") or []):
        # **Nur noch die Schwere, nicht die Menge.**
        #
        # Hier stand, wie viele Momente es sind und wo Pausen lagen. Beides sagt etwas
        # darueber, wie fleissig jemand schreibt und wann er im Urlaub war — und ein Bild,
        # das sich daran aendert, aendert sich aus dem falschen Grund. Die Legende sagt das
        # jetzt ausdruecklich, damit niemand die Zahl im Bild sucht.
        zeilen.append({
            "was": {"landschaft": "Wie hart das Gelände ist",
                    "wasser": "Wie ruhig oder rauh das Wasser ist",
                    "haus": "Die Oberflächen der Räume",
                    "wald": "Der Boden und die Rinde",
                    "himmel": "Wie weich oder scharf die Wolken sind",
                    "faden": "Wie grob der Stoff ist"}[welt["key"]],
            "wofuer": "Wie schwer die Momente im Schnitt waren, die du festgehalten hast. "
                      "Wie viele es sind und wo Pausen lagen, ändert am Bild nichts",
        })
    if "grundton" in schichten and werte.get("grundton"):
        zeilen.append({
            "was": "Licht und Wetter",
            "wofuer": "Dein zuletzt bestätigtes Gefühlsbild — angenehm bis unangenehm wird "
                      "die Temperatur des Lichts, ruhig bis aufgewühlt wird die Bewegung "
                      "der Luft",
        })
    if not fuehrend and "durchgaenge" in schichten and any(
            float(d.get("wert") or 0) > 0.25 for d in (werte.get("durchgaenge") or [])):
        zeilen.append({
            "was": {"landschaft": "Die Mauer, die durchs Bild läuft",
                    "wasser": "Die Strömung darunter", "haus": "Der Riss durch alle Räume",
                    "wald": "Die Wurzeln unter allem", "himmel": "Der lange Wolkenstreifen",
                    "faden": "Der durchgehende Faden"}[welt["key"]],
            "wofuer": "Was sich wiederholt — es läuft durch alles hindurch, nicht nur an "
                      "einer Stelle",
        })
    if "lichter" in schichten and (werte.get("lichter") or []):
        zahl = len(werte["lichter"])
        zeilen.append({
            "was": "Die Lichter",
            "wofuer": f"Deine {zahl} Erkenntnisse — was du selbst verstanden und "
                      "festgehalten hast. Sie sind das Einzige im Bild, das leuchtet"
            if zahl > 1 else
            "Deine Erkenntnis — was du selbst verstanden und festgehalten hast. Sie ist das "
            "Einzige im Bild, das leuchtet",
        })
    if "leerstellen" in schichten and (werte.get("leerstellen") or []):
        zahl = len(werte["leerstellen"])
        zeilen.append({
            "was": {"landschaft": "Die kahlen Stellen", "wasser": "Das reglose Wasser",
                    "haus": "Die Türen ins Nichts", "wald": "Die Lichtungen",
                    "himmel": "Der leere Himmel", "faden": "Die Löcher im Gewebe"}[welt["key"]],
            # **Wie viele, nicht welche.** Welcher Wunsch es ist, steht in deiner Skizze und
            # verlaesst den Server nicht — waere er hier, waere er auch im Prompt, und ein
            # Modell macht aus jedem Wort, das es bekommt, ein Bild.
            "wofuer": f"{zahl} Dinge aus deiner Traumbeziehung, die dir viel bedeuten und in "
                      "diesem Fall nicht vorkommen. Welche das sind, sagt das Bild nicht — "
                      "nur, dass sie fehlen"
            if zahl > 1 else
            "Etwas aus deiner Traumbeziehung, das dir viel bedeutet und in diesem Fall nicht "
            "vorkommt. Was es ist, sagt das Bild nicht — nur, dass es fehlt",
        })
    if "druck" in schichten and werte.get("druck") is not None:
        zeilen.append({
            "was": "Was von einer Seite drückt",
            "wofuer": "Dass über die andere Person etwas festgehalten ist — als Kraft auf "
                      "das Ganze, nie als Gestalt darin. Was dort steht, geht nicht ins "
                      "Bild ein, nur dass es da ist",
        })

    # Symbolik und Figur gehören genauso aufgelöst: Ein Zeichen, das niemand erklärt, wird
    # gedeutet — und dann deutet die Person unser Bild statt ihre Lage.
    stufe = str(einstellungen.get("symbolik") or STANDARD_SYMBOLIK)
    if stufe != "keine":
        # `.capitalize()` waere hier falsch: Es schreibt den REST klein, und aus
        # „Die Schwelle und das Tier" wuerde „Die schwelle und das tier".
        was = ["die Schwelle"] if ("leerstellen" in schichten
                                   and (werte.get("leerstellen") or [])) else []
        if stufe == "deutlich":
            was.append("das Tier und die Zeichen")
        if was:
            satz = " und ".join(was)
            zeilen.append({
                "was": satz[0].upper() + satz[1:],
                "wofuer": "Sinnbilder, keine Aussagen — eine Schwelle steht für etwas, das "
                          "fehlt und erreichbar wäre. Was sie dir bedeuten, entscheidest du",
            })
    if zeigt_mich(einstellungen):
        zeilen.append(_gestalt_zeile(einstellungen, regie))

    # **Der Rückfall wird gesagt, nicht verschwiegen.**
    #
    # Wer „Aus deinem Fall" gewählt hat und ein Bild aus dem Baukasten bekommt, sieht sonst
    # nur, dass nichts anders ist — und glaubt, das Umstellen habe nichts gebracht. Genau so
    # ist es einmal gelaufen: Ein einziges verbotenes Wort hat drei Aufträge verworfen, und
    # von außen war das nicht zu unterscheiden von „das Tool kann es nicht".
    if str(einstellungen.get("quelle") or "") == "fall":
        zeilen.append({
            "was": "Dieses Bild kommt aus dem Baukasten",
            "wofuer": "Aus deinem Fall ließ sich diesmal kein Bildauftrag machen, der durch "
                      "die Prüfung kam — meist, weil noch zu wenig eigener Text da ist oder "
                      "weil der Entwurf jemanden abgebildet hätte. Versuch es noch einmal, "
                      "beim nächsten Mal geht es oft durch",
        })
    return zeilen

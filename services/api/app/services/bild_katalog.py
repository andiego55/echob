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


def _menge(zahl: int, wenig: str, mittel: str, viel: str) -> str:
    if zahl <= 4:
        return wenig
    if zahl <= 14:
        return mittel
    return viel


# ── Die Bildwelten ───────────────────────────────────────────────────────────
#
# Jede übersetzt dieselben sechs Größen in ihre eigene Sprache. Das ist der Kern dieser
# Datei: Nicht „ein Bild zu meinem Fall", sondern **dieselbe Struktur, in einem Gleichnis, das
# die Person gewählt hat.**
#
# Jede Bildwelt bringt mit:
#   szene      Der Ort selbst, ohne alles Weitere.
#   weg        Wie die Momente vorkommen (aus Dichte und Rhythmus).
#   textur     Wie hart die Welt ist (aus der Belastung).
#   faden      Das Wiederkehrende, das durch alles läuft (aus den Mustern).
#   licht      Die Erkenntnisse — das Einzige, was leuchtet.
#   leere      Was fehlt, als sichtbare Abwesenheit.
#   druck      Die andere Person: nie Gestalt, immer Wetter, Masse oder Richtung.

BILDWELTEN: tuple[dict[str, Any], ...] = (
    {
        "key": "landschaft",
        "label": "Landschaft",
        "hinweis": "Ein Gelände mit Wetter und Weite — was zu gehen ist, liegt vor dir.",
        "szene": "a wide open landscape seen from a low vantage point, distant horizon",
        "weg": {
            "dicht": "a narrow track almost lost in dense thorny undergrowth that crowds it "
                     "from both sides",
            "mittel": "a worn path winding across open ground, sometimes clear, sometimes "
                      "overgrown",
            "weit": "a faint trail across a wide empty plain, long stretches of nothing "
                    "between its traces",
        },
        "ballung": "the path is knotted and doubled back on itself in one place, while "
                   "elsewhere it runs long and straight through emptiness",
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
        "szene": "a body of water seen close to its surface, depth suggested below",
        "weg": {
            "dicht": "the surface broken by close-packed choppy waves that never settle",
            "mittel": "a current with alternating stretches of ripples and calm",
            "weit": "a nearly still surface with a few solitary rings spreading far apart",
        },
        "ballung": "one area churns violently while the rest of the water lies flat and "
                   "unmoving",
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
        "szene": "the inside of an old building seen as empty rooms and passages, no one "
                 "present",
        "weg": {
            "dicht": "many doorways crowded close together along a narrow corridor",
            "mittel": "a sequence of rooms opening one into the next, some wide, some tight",
            "weit": "a long bare corridor with very few doors, most of it empty wall",
        },
        "ballung": "one cluster of rooms is crammed and cluttered, while a long empty wing "
                   "stretches away from it",
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
        "szene": "deep woodland seen from within, trunks receding into depth",
        "weg": {
            "dicht": "trees standing so close that almost no ground is visible between them",
            "mittel": "woodland of moderate density with room to move between the trunks",
            "weit": "a few isolated trees standing far apart on open ground",
        },
        "ballung": "one thicket so dense it is impenetrable, and beyond it a long open "
                   "stretch with nothing",
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
        "szene": "an expanse of sky seen from below, with weather and depth",
        "weg": {
            "dicht": "banks of cloud packed tightly one behind another, no gaps",
            "mittel": "scattered clouds drifting with clear air between them",
            "weit": "a few high thin wisps in an otherwise open sky",
        },
        "ballung": "one dense mass of storm cloud, and beside it an immense clear emptiness",
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
        "szene": "a large woven textile seen close up, its structure visible",
        "weg": {
            "dicht": "an area worked so tightly that the individual threads can barely be "
                     "told apart",
            "mittel": "an even weave with visible regular structure",
            "weit": "a loose open weave with wide gaps between the threads",
        },
        "ballung": "one dense knotted mass of thread, and a long stretch where the weave is "
                   "almost bare",
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


# ── Die Figur ────────────────────────────────────────────────────────────────
#
# **Es gibt hoechstens EINE, und sie ist die Person selbst.**
#
# Das ist die Grenze, an der alles haengt. Eine zweite Gestalt waere als die andere Person
# lesbar — und eine Abbildung eines echten, namentlich bekannten Menschen aus den Angaben
# einer Seite ist genau das, was hier nie entstehen darf. Ob im Bild zwei Menschen stehen, ist
# deshalb keine Geschmacksfrage.
#
# **Kein Gesicht.** Von hinten, in Entfernung, klein im Bild. Ein Gesicht waere ein Portraet
# von jemandem, der nie dafuer sass — und es laedt zum Wiedererkennen ein, mit allem, was
# daran haengt: Haltung, Groesse, Ausdruck. Alles davon waere erfunden.
#
# **Die Erscheinung kommt aus der Selbstauskunft und nur daraus.** Sie kennt Altersspanne und
# Geschlecht (letzteres freiwillig) — mehr nicht. Fuer eine Rueckenfigur in der Ferne reicht
# das; alles Weitere waere ausgedacht.

FIGUR_STUFEN: tuple[dict[str, str], ...] = (
    {"key": "keine", "label": "Niemand",
     "hinweis": "Der Ort ist leer."},
    {"key": "ich", "label": "Ich, von hinten",
     "hinweis": "Eine einzelne Gestalt in der Ferne, ohne Gesicht."},
)

FIGUR_SCHLUESSEL = {f["key"] for f in FIGUR_STUFEN}
STANDARD_FIGUR = "keine"


def figur_beschreibung(selbst: dict[str, Any] | None) -> str:
    """Die Rueckenfigur, aus der Selbstauskunft — und aus nichts sonst.

    Ohne Angaben bleibt sie unbestimmt. **Eine erfundene Erscheinung waere schlimmer als
    keine**: Wer sich in einer Gestalt nicht wiedererkennt, liest das Bild als Aussage ueber
    jemand anderen.
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

    return (
        f"A single small figure far away in the scene: {', '.join(teile)}, "
        "seen entirely from behind and turned away, facing into the distance. "
        "The figure is small in the frame and no facial features are visible or implied. "
        "There is no one else anywhere in the image."
    )


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
    "- There is AT MOST ONE human figure in the image, and only if one is described above. "
    "Never two people, never a couple, never a group, never a second figure of any kind — "
    "not in the distance, not as a shadow, not as a reflection.\n"
    "- Any figure is seen from behind or from far away. No face, no facial features, nobody "
    "turned toward the viewer, no portrait, no reflection showing a face.\n"
    "- Animals may appear as described above; they are calm and at a distance, never "
    "threatening, never menacing, never looking at the viewer.\n"
    "- No letters, numbers, words, writing, signatures, logos or frames.\n"
    "- Nothing violent or gory, no weapons, no blood, no restraints, no cages.\n"
    "- This is not an illustration of an event and not a scene from a story. It is a place "
    "that carries a mood.\n"
    "- Quiet and restrained rather than dramatic or spectacular. It should feel true, not "
    "impressive."
)


def _jahreszeit(werte: dict[str, Any]) -> str | None:
    """Die Jahreszeit der dichtesten Stelle — aus echten Daten, nicht geraten.

    Billig zu haben und stark in der Wirkung: Wer weiß, dass es im Herbst dicht wurde, sieht
    den Herbst und erkennt SEINEN Verlauf.
    """
    from datetime import date, timedelta

    szenen = werte.get("szenen") or []
    beginn = werte.get("beginn")
    if not szenen or not beginn:
        return None
    try:
        start = date.fromisoformat(str(beginn))
    except (ValueError, TypeError):
        return None

    # Die dichteste Stelle: das Fenster von 60 Tagen mit den meisten Momenten.
    tage = sorted(s["tag"] for s in szenen)
    bestes, beste_zahl = tage[0], 0
    for t in tage:
        zahl = sum(1 for x in tage if t <= x < t + 60)
        if zahl > beste_zahl:
            bestes, beste_zahl = t, zahl
    monat = (start + timedelta(days=bestes + 30)).month
    return JAHRESZEITEN.get(monat)


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


def fuehrendes_muster(werte: dict[str, Any], schichten: set[str]) -> str | None:
    """Der Schlüssel des stärksten Musters — oder nichts.

    **Das ist die Stelle, an der ein Mensch seinen eigenen Fall wiedererkennt:** nicht an der
    Zahl der Momente, sondern daran, WAS sich wiederholt. Dieselbe Auswahl braucht der Prompt
    und die Legende, also steht sie an einer Stelle.
    """
    if "durchgaenge" not in schichten:
        return None
    stark = sorted(
        (d for d in (werte.get("durchgaenge") or []) if float(d.get("wert") or 0) > 0.45),
        key=lambda d: -float(d["wert"]),
    )
    for d in stark:
        if str(d.get("key")) in MUSTER_BILDER:
            return str(d["key"])
    return None


def prompt_bauen(werte: dict[str, Any], einstellungen: dict[str, Any]) -> str:
    """Aus Zahlen wird ein Gleichnis.

    **Ein Leitbild, dann Stützen, dann Atmosphäre — und nicht alles auf einmal.**

    Die erste Fassung hängte acht bis zehn gleichrangige Sätze aneinander, und genau so sahen
    die Bilder aus: voll und ohne Mitte. Ein Bildmodell folgt dem, was am Anfang steht, und
    baut alles Weitere darum herum. Dicht in Bedeutung heißt nicht voll.

    **Das Leitbild kommt aus dem stärksten Muster des Falls.** Das ist die Stelle, an der ein
    Mensch seinen eigenen Fall wiedererkennt: nicht an der Zahl der Momente, sondern daran,
    WAS sich wiederholt. Gibt es kein starkes Muster, führt die Zeitgestalt.

    Kein Szenentext, kein Skalenname und kein Satz der Person gehen hinaus — die Skala wählt
    ein Bild aus, das hier steht.
    """
    welt = next(
        (b for b in BILDWELTEN if b["key"] == einstellungen.get("bildwelt")), BILDWELTEN[0])
    hand = next(
        (h for h in HANDSCHRIFTEN if h["key"] == einstellungen.get("handschrift")),
        HANDSCHRIFTEN[0])
    farbe = FARBWORTE.get(str(einstellungen.get("palette")), FARBWORTE["kuehl"])
    schichten = set(einstellungen.get("schichten") or [])
    szenen = werte.get("szenen") or []

    # ── Die Muster, stärkstes zuerst ────────────────────────────────────────
    muster: list[str] = []
    if "durchgaenge" in schichten:
        stark = sorted(
            (d for d in (werte.get("durchgaenge") or []) if float(d.get("wert") or 0) > 0.45),
            key=lambda d: -float(d["wert"]),
        )
        for d in stark:
            bild = muster_bild(str(d.get("key")), welt["key"])
            if bild:
                muster.append(bild)

    # ── Die Zeitgestalt ─────────────────────────────────────────────────────
    zeitgestalt: str | None = None
    ballung = False
    if "szenen" in schichten and szenen:
        tage = sorted(s["tag"] for s in szenen)
        spanne = max(1, tage[-1] - tage[0])
        luecken = [tage[i + 1] - tage[i] for i in range(len(tage) - 1)] or [spanne]
        je_monat = len(szenen) / max(1.0, spanne / 30)
        raum = "dicht" if je_monat > 2.5 else ("mittel" if je_monat > 0.8 else "weit")
        zeitgestalt = welt["weg"][raum]
        ballung = max(luecken) > spanne * 0.3 and len(szenen) > 4

    # ── Satz 1: das Leitbild ────────────────────────────────────────────────
    leit = muster[0] if muster else (zeitgestalt or welt["szene"])
    teile: list[str] = [
        _satz(hand["prompt"]),
        f"A single quiet image. The subject is {leit.rstrip('.')}.",
        f"It is set in {welt['szene'].rstrip('.')}. Colour: {farbe}.",
    ]

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

    if zeitgestalt and not muster:
        teile.append(_satz(zeitgestalt))
    if ballung:
        teile.append(_satz(welt["ballung"]))

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
    zeit = _jahreszeit(werte) if "szenen" in schichten else None
    if zeit:
        teile.append(f"The season is {zeit}.")

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
            if not muster and "durchgaenge" in schichten and any(
                    float(d.get("wert") or 0) > 0.25
                    for d in (werte.get("durchgaenge") or [])):
                zeichen.append(sym["uebergang"])
            zeichen.append(sym["tier"])
            if "lichter" in schichten and (werte.get("lichter") or []):
                zeichen.append(sym["zeichen"])
        if zeichen:
            teile.append("Somewhere in the scene: " + "; ".join(zeichen) + ".")

    if einstellungen.get("figur") == "ich":
        teile.append(figur_beschreibung(einstellungen.get("selbst")))

    # ── Komposition ─────────────────────────────────────────────────────────
    #
    # **Ohne diesen Absatz wird aus einer guten Aufzählung ein schlechtes Bild.** Ein Modell
    # verteilt sonst alles gleichmäßig über die Fläche; was fehlt, ist eine Mitte, Tiefe und
    # Luft. Das ist der Unterschied zwischen einem Wimmelbild und einem, das man ansehen mag.
    teile.append(
        "Composition: one clear focal point, with foreground, middle distance and far "
        "distance readable as separate depths. Generous empty space. The light comes from "
        "one direction only. Nothing is centred exactly. It should look like one place seen "
        "at one moment, not a collection of things."
    )
    teile.append(GRENZE)
    return "\n".join(teile)


def legende(einstellungen: dict[str, Any], werte: dict[str, Any]) -> list[dict[str, str]]:
    """Was im Bild wofür steht — **und ohne das ist das Bild bloß hübsch.**

    Eine Metapher, die niemand auflöst, bleibt Dekoration. Die Legende nennt für jede
    eingeschaltete Schicht, welches Element des Bildes daraus entstanden ist. Sie ist keine
    Deutung: Sie sagt „die Lichter sind deine Erkenntnisse", nicht „du hast viel verstanden".
    """
    welt = next(
        (b for b in BILDWELTEN if b["key"] == einstellungen.get("bildwelt")), BILDWELTEN[0])
    schichten = set(einstellungen.get("schichten") or [])
    zeilen: list[dict[str, str]] = []

    # **Das Leitbild zuerst — es traegt das Bild.**
    #
    # Ohne diese Zeile sieht die Person ein Bild, das aus ihrem staerksten Muster entstanden
    # ist, und erfaehrt es nicht. Genau daran haengt, ob sie ihren eigenen Fall wiedererkennt.
    fuehrend = fuehrendes_muster(werte, schichten)
    weitere = [
        MUSTER_LABEL.get(str(d.get("key")), "")
        for d in sorted(
            (d for d in (werte.get("durchgaenge") or [])
             if float(d.get("wert") or 0) > 0.45 and str(d.get("key")) in MUSTER_BILDER),
            key=lambda d: -float(d["wert"]),
        )[1:3]
    ] if "durchgaenge" in schichten else []

    if fuehrend:
        zeilen.append({
            "was": "Das Hauptmotiv",
            "wofuer": f"Dein stärkstes Muster: {MUSTER_LABEL.get(fuehrend, fuehrend)}. "
                      "Es bestimmt, was auf dem Bild zu sehen ist",
        })
        if [w for w in weitere if w]:
            zeilen.append({
                "was": "Was noch im Bild steht",
                "wofuer": "Weitere Muster: " + ", ".join(w for w in weitere if w),
            })

    if "szenen" in schichten and (werte.get("szenen") or []):
        # **Wenn ein Muster führt, trägt der Ort nicht mehr die Momente.** Dann sind es die
        # Häufungen und Pausen darin — und die Legende muss sagen, was wirklich zu sehen ist,
        # sonst sucht die Person etwas, das nicht da ist.
        zeilen.append({
            "was": ("Die Häufungen und die Pausen" if fuehrend else
                    {"landschaft": "Der Weg und das Gelände",
                     "wasser": "Die Bewegung des Wassers",
                     "haus": "Die Räume und Türen", "wald": "Wie dicht die Bäume stehen",
                     "himmel": "Die Wolken", "faden": "Wie dicht gewebt ist"}[welt["key"]]),
            "wofuer": f'{len(werte["szenen"])} festgehaltene Momente — wie viele, wie dicht '
                      "beieinander, und wo Pausen waren",
        })
    if "grundton" in schichten and werte.get("grundton"):
        zeilen.append({"was": "Licht und Wetter",
                       "wofuer": "Dein zuletzt bestätigtes Gefühlsbild"})
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
        zeilen.append({"was": "Die Lichter",
                       "wofuer": "Was du selbst verstanden und festgehalten hast"})
    if "leerstellen" in schichten and (werte.get("leerstellen") or []):
        zeilen.append({
            "was": {"landschaft": "Die kahlen Stellen", "wasser": "Das reglose Wasser",
                    "haus": "Die Türen ins Nichts", "wald": "Die Lichtungen",
                    "himmel": "Der leere Himmel", "faden": "Die Löcher im Gewebe"}[welt["key"]],
            "wofuer": "Was du dir wünschst und im Fall nicht vorkommt",
        })
    if "druck" in schichten and werte.get("druck") is not None:
        zeilen.append({
            "was": "Was von einer Seite drückt",
            "wofuer": "Die andere Person — als Kraft auf das Ganze, nie als Gestalt darin",
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
    if einstellungen.get("figur") == "ich":
        zeilen.append({
            "was": "Die Gestalt von hinten",
            "wofuer": "Du — nach deiner Selbstauskunft, ohne Gesicht und in Entfernung. "
                      "Es kommt niemand sonst im Bild vor",
        })
    return zeilen

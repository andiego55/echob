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
    "- No people at all: no figures, faces, bodies, hands, silhouettes or shadows of people. "
    "The place is empty of anyone.\n"
    "- No animals or creatures.\n"
    "- No letters, numbers, words, writing, signatures, logos or frames.\n"
    "- Nothing violent or gory, no weapons, no blood, no threatening figures.\n"
    "- This is not an illustration of an event and not a scene from a story. It is a place "
    "that carries a mood.\n"
    "- Quiet and restrained rather than dramatic or spectacular. It should feel true, not "
    "impressive."
)


def prompt_bauen(werte: dict[str, Any], einstellungen: dict[str, Any]) -> str:
    """Aus Zahlen wird ein Gleichnis — **aus Zahlen und aus nichts anderem.**

    Kein Szenentitel, kein Text, kein Skalenname, kein Satz der Person geht hinaus. Was
    hineingeht, ist Anzahl, Dichte, Rhythmus, Belastung und Leere — übersetzt in die Sprache
    der Bildwelt, die die Person gewählt hat.
    """
    welt = next(
        (b for b in BILDWELTEN if b["key"] == einstellungen.get("bildwelt")), BILDWELTEN[0])
    hand = next(
        (h for h in HANDSCHRIFTEN if h["key"] == einstellungen.get("handschrift")),
        HANDSCHRIFTEN[0])
    farbe = FARBWORTE.get(str(einstellungen.get("palette")), FARBWORTE["kuehl"])
    schichten = set(einstellungen.get("schichten") or [])

    teile: list[str] = [f"{hand['prompt']}.", f"Subject: {welt['szene']}.", f"Colour: {farbe}."]

    szenen = werte.get("szenen") or []
    if "szenen" in schichten and szenen:
        tage = sorted(s["tag"] for s in szenen)
        spanne = max(1, tage[-1] - tage[0])
        luecken = [tage[i + 1] - tage[i] for i in range(len(tage) - 1)] or [spanne]
        # Dichte über die Zeit: viele Momente auf kurzer Strecke oder wenige auf langer.
        je_monat = len(szenen) / max(1.0, spanne / 30)
        raum = "dicht" if je_monat > 2.5 else ("mittel" if je_monat > 0.8 else "weit")
        teile.append(welt["weg"][raum] + ".")

        # Ballung: Eine große Lücke neben Häufungen — das, was eine Liste nie zeigt.
        if max(luecken) > spanne * 0.3 and len(szenen) > 4:
            teile.append(welt["ballung"] + ".")

        haerte = sum(float(s.get("haerte") or 0.5) for s in szenen) / len(szenen)
        teile.append(welt["textur"][_stufe(haerte, "weich", "mittel", "hart")] + ".")

    if "grundton" in schichten and werte.get("grundton"):
        g = werte["grundton"]
        # valenz -> Licht und Wärme, aktivierung -> Bewegung. Zwei Größen, zwei Wirkungen.
        teile.append(
            _stufe(float(g.get("temperatur") or 0.5),
                   "cold hard light, late winter",
                   "even overcast light, no strong sun",
                   "low warm light, late in the day")
            + ", "
            + _stufe(float(g.get("unruhe") or 0.5),
                     "completely still air, nothing moving",
                     "some movement, a light wind",
                     "everything in motion, wind driving through the whole scene")
            + "."
        )

    if "durchgaenge" in schichten:
        stark = [d for d in (werte.get("durchgaenge") or []) if float(d.get("wert") or 0) > 0.25]
        if stark:
            teile.append(
                welt["faden"]
                + f" — {_menge(len(stark), 'one of these', 'a few of these', 'several of these')}"
                " running through the whole scene, present everywhere rather than in one "
                "spot."
            )

    if "lichter" in schichten and (werte.get("lichter") or []):
        teile.append(
            welt["licht"] + " — these are the only bright things in the image and nothing "
            "else competes with them."
        )

    if "leerstellen" in schichten and (werte.get("leerstellen") or []):
        anzahl = len(werte["leerstellen"])
        teile.append(
            welt["leere"]
            + f" — {_menge(anzahl, 'one or two of these', 'several of these', 'several of these')}"
            ", clearly absent rather than hidden."
        )

    if "druck" in schichten and werte.get("druck") is not None:
        teile.append(welt["druck"] + ".")

    teile.append(
        "Composition: a single coherent place, unhurried, with room to breathe. "
        "Not decorative, not idyllic, not dramatic."
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

    if "szenen" in schichten and (werte.get("szenen") or []):
        zeilen.append({
            "was": {"landschaft": "Der Weg und das Gelände", "wasser": "Die Bewegung des Wassers",
                    "haus": "Die Räume und Türen", "wald": "Wie dicht die Bäume stehen",
                    "himmel": "Die Wolken", "faden": "Wie dicht gewebt ist"}[welt["key"]],
            "wofuer": f'{len(werte["szenen"])} festgehaltene Momente — wie viele, wie dicht '
                      "beieinander, und wo Pausen waren",
        })
    if "grundton" in schichten and werte.get("grundton"):
        zeilen.append({"was": "Licht und Wetter",
                       "wofuer": "Dein zuletzt bestätigtes Gefühlsbild"})
    if "durchgaenge" in schichten and any(
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
    return zeilen

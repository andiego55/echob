"""Der gemalte Weg: Handschriften und der Prompt.

Konzept: https://claude.ai/code/artifact/dc994cdb-d9d1-475d-a856-d93e0035d6e1

**Die Entscheidung, die alles andere bestimmt: Das Bildmodell bekommt die STRUKTUR, nicht die
Geschichte.**

Es wäre naheliegend, den Fall zu beschreiben und malen zu lassen — und es wäre falsch, aus
zwei Gründen:

* **Figuren.** Ein Modell, das „eine schwierige Partnerschaft" hört, malt zwei Menschen. Das
  ist eine Abbildung eines echten, namentlich bekannten Abwesenden, erzeugt aus den Angaben
  einer Seite. „Keine Menschen" als Bitte hilft nicht zuverlässig; kein figuratives Material
  im Prompt hilft.
* **Erfindung.** Jedes Detail, das aus dem Text entsteht — das Licht, die Haltung, der
  Abstand —, ist erfunden und sieht aus wie ein Zeuge.

Also geht genau dasselbe hinein wie in den gerechneten Weg: **Zahlen.** Wie viele Momente, wie
dicht, welcher Rhythmus, welche Richtung, wie viele Leerstellen. Der gemalte Weg zeichnet die
gleiche Struktur in seiner eigenen Handschrift.

**Kein Freitext.** Beim Podcast gibt es einen — dort führt er zu einem Satz mehr über das
eigene Erleben. Hier führte er zu einer Gestalt: „zeig, wie er weggeht" ist genau die
Abbildung, die es nicht geben soll. Was die Person steuert, sind Handschrift, Farbe und
welche Schichten mitgehen.

**Der Prompt ist auf Englisch.** Nicht aus Nachlässigkeit: Bildmodelle folgen englischen
Formanweisungen zuverlässiger, und dieser Prompt besteht ausschließlich aus Formanweisungen —
es steht kein Satz über einen Menschen darin, der übersetzt werden müsste.
"""
from __future__ import annotations

from typing import Any

#: Die Handschriften — der visuelle Register, in dem gemalt wird.
#:
#: **Keine heißt „schön", und keine ist ein Urteil** — dieselbe Regel wie bei den Paletten des
#: gerechneten Wegs. Alle fünf sind gegenstandslos: Es gibt keine, die eine Szene malen
#: könnte, auch wenn jemand es versuchte.
HANDSCHRIFTEN: tuple[dict[str, Any], ...] = (
    {
        "key": "tusche",
        "label": "Tusche",
        "hinweis": "Nass aufgetragen, mit Rändern und Läufen.",
        "prompt": "ink and wash on damp paper, visible bleeding edges and water marks, "
                  "granular pigment settling, uneven absorption",
    },
    {
        "key": "grafit",
        "label": "Grafit",
        "hinweis": "Trocken, gerieben, mit sichtbarem Korn.",
        "prompt": "graphite and dry pigment rubbed on textured paper, visible tooth of the "
                  "paper, smudged transitions, eraser marks left in",
    },
    {
        "key": "gewebe",
        "label": "Gewebe",
        "hinweis": "Aus Fäden und Linien, dicht verwoben.",
        "prompt": "densely woven threads and fine lines, layered like textile, some threads "
                  "taut and some slack, frayed at the edges",
    },
    {
        "key": "flaeche",
        "label": "Flächen",
        "hinweis": "Ruhige Felder, klar gegeneinander gesetzt.",
        "prompt": "large flat fields of matte colour with hard clean edges, printed by hand, "
                  "slight misregistration between layers",
    },
    {
        "key": "kollage",
        "label": "Collage",
        "hinweis": "Gerissene Kanten, übereinandergelegt.",
        "prompt": "torn paper collage, overlapping fragments with visible ragged edges and "
                  "shadow gaps, aged and uneven surfaces",
    },
)

HANDSCHRIFT_SCHLUESSEL = {h["key"] for h in HANDSCHRIFTEN}
STANDARD_HANDSCHRIFT = "tusche"

#: Die Farbregister, in Worten statt in Hexwerten.
#:
#: Dieselben fünf Namen wie beim gerechneten Weg, damit ein Mensch zwei Bilder vergleichen
#: kann — aber als Beschreibung, weil ein Bildmodell keinen Hexwert versteht.
FARBWORTE: dict[str, str] = {
    "kuehl": "a restrained cool palette: slate blue, grey-green, pale stone, deep navy",
    "warm": "a warm earthen palette: ochre, terracotta, umber, aged cream",
    "erdig": "a muted natural palette: olive, clay, moss, bone, dust",
    "nacht": "a dark palette: near-black ground with cold pale greys and one thin bright value",
    "schwarzweiss": "strictly achromatic: black, white and greys only, no colour at all",
}

#: **Die Grenze, und sie steht am Ende des Prompts.**
#:
#: Ein Modell gewichtet, was zuletzt und was bestimmt formuliert ist. Deshalb steht das Verbot
#: nicht als Nebensatz vorn, sondern als eigener Absatz am Schluss — und es ist zweimal
#: gesagt: einmal positiv (was es IST) und einmal als Liste (was es NICHT enthält).
#:
#: Positiv zuerst, weil ein Modell mit „no people" allein oft trotzdem Menschen malt: Die
#: Verneinung nennt das Wort, und das Wort wirkt.
GRENZE = (
    "This is a purely abstract, non-figurative composition — nothing in it is recognisable "
    "as a thing. It consists only of form, colour, texture and empty space.\n"
    "It must contain NO people, no faces, no bodies, no hands, no silhouettes, no animals, "
    "no rooms, no furniture, no doors, no windows, no landscapes, no horizon, no plants, "
    "no recognisable objects, no symbols, no hearts, no chains, no cages, no arrows, "
    "no letters, no numbers, no words, no signature, no frame and no border."
)

#: Was ein Bild kostet, ist noch NICHT gemessen — die Zahl im Kontingent ist eine Annahme.
#:
#: Anders als beim Podcast, wo die Sprachausgabe je Minute abgerechnet wird, zählt hier das
#: Stück: Ein Bild ist ein Bild, die Größe ist fest.
MAX_ERZEUGTE_JE_MONAT_HINWEIS = (
    "Gezählt wird in Stück. Ein Bild ist ein Bild — anders als beim Podcast, wo die Länge "
    "den Preis macht."
)


def _menge(zahl: int, wenig: str, mittel: str, viel: str) -> str:
    """Eine Zahl als Wort. Ein Bildmodell kann mit „23" nichts anfangen, mit „many" schon."""
    if zahl <= 4:
        return wenig
    if zahl <= 14:
        return mittel
    return viel


def prompt_bauen(werte: dict[str, Any], einstellungen: dict[str, Any]) -> str:
    """Aus Zahlen wird ein Prompt — **und aus nichts anderem.**

    Kein Szenentitel, kein Text, kein Skalenname, kein Satz der Person. Was hineingeht, ist
    Anzahl, Dichte, Rhythmus, Richtung und Leere. Damit gibt es im Prompt kein figuratives
    Material, an dem ein Modell eine Gestalt aufhängen könnte.
    """
    handschrift = next(
        (h for h in HANDSCHRIFTEN if h["key"] == einstellungen.get("handschrift")),
        HANDSCHRIFTEN[0])
    farbe = FARBWORTE.get(str(einstellungen.get("palette")), FARBWORTE["kuehl"])
    schichten = set(einstellungen.get("schichten") or [])

    szenen = werte.get("szenen") or []
    teile: list[str] = [
        f"An abstract composition on a square canvas, {handschrift['prompt']}.",
        f"Colour: {farbe}.",
    ]

    if "szenen" in schichten and szenen:
        anzahl = len(szenen)
        # Dichte: Wie sehr sich die Momente in der Zeit häufen. Aus den Abständen gerechnet,
        # nicht geschätzt — dieselbe Eigenschaft, die der gerechnete Weg als Position zeigt.
        tage = sorted(s["tag"] for s in szenen)
        spanne = max(1, (tage[-1] - tage[0]))
        luecken = [tage[i + 1] - tage[i] for i in range(len(tage) - 1)] or [spanne]
        groesste = max(luecken)
        ballung = groesste > spanne * 0.3

        schwer = sum(1 for s in szenen if float(s.get("gewicht") or 0) > 0.6)
        hart = sum(1 for s in szenen if float(s.get("haerte") or 0) > 0.6)

        teile.append(
            f"{_menge(anzahl, 'A few', 'Several', 'Many')} separate marks "
            f"({anzahl} in total), "
            + ("unevenly clustered with one large calm emptiness between the groups"
               if ballung else
               "spread at a fairly even rhythm across the whole surface")
            + "."
        )
        if schwer:
            teile.append(
                f"{_menge(schwer, 'A small number of', 'Some', 'Most')} of the marks are "
                "markedly larger and heavier than the rest."
            )
        # Die Härte trägt die FORM, nie die Farbe — dieselbe Regel wie beim gerechneten Weg.
        if hart:
            teile.append(
                f"{_menge(hart, 'A few', 'Some', 'Many')} of the marks have sharp angular "
                "edges; the others are soft and rounded."
            )
        else:
            teile.append("All marks are soft-edged and rounded.")

    if "durchgaenge" in schichten:
        stark = [d for d in (werte.get("durchgaenge") or []) if float(d.get("wert") or 0) > 0.25]
        if stark:
            teile.append(
                f"{_menge(len(stark), 'One or two', 'Several', 'Many')} continuous lines run "
                "from one edge of the canvas to the other, passing behind everything else — "
                "they are part of the whole surface, not events in one place."
            )

    if "lichter" in schichten and (werte.get("lichter") or []):
        teile.append(
            "A few very small points of the brightest value in the image; they are the only "
            "bright accents and nothing else competes with them."
        )

    if "leerstellen" in schichten and (werte.get("leerstellen") or []):
        anzahl = len(werte["leerstellen"])
        teile.append(
            f"{_menge(anzahl, 'One or two', 'Several', 'Several')} clear voids — areas of "
            "untouched ground that everything else keeps away from. They read as absence, "
            "not as shapes."
        )

    if "druck" in schichten and werte.get("druck") is not None:
        teile.append(
            "The whole field is compressed towards one edge, as if under pressure from that "
            "side; the pressure itself is not depicted, only its effect on the spacing."
        )

    teile.append(
        "The composition is not harmonious or decorative and does not resolve: it is "
        "accurate, quiet and a little uncomfortable."
    )
    teile.append(GRENZE)
    return "\n".join(teile)

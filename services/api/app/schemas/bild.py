"""Pydantic-Schemas für die Bildwerkstatt."""
from __future__ import annotations

from pydantic import BaseModel, Field


class BildMalen(BaseModel):
    """Die Bestellung eines Bildes.

    **Zwei Freitextfelder, und beide gab es lange nicht.** „Kein Freitext" war hier einmal
    eine Entscheidung mit gutem Grund: „zeig, wie er weggeht" ginge als Satz direkt an ein
    Bildmodell und wäre die Abbildung eines echten Menschen. Seit die Bildregie dazwischen
    steht, liegt ein Wunsch eine Ebene weiter weg — er wird von einem Sprachmodell GELESEN,
    und was hinausgeht, ist der geprüfte Bildauftrag.

    Gesteuert wird: woraus (Fall oder Baukasten), worin (Bildwelt), wie gemalt (Handschrift,
    Farbe, Abstraktionsgrad), was wie schwer wiegt (Gewichte), welche Stimmung, welche Szenen,
    wer vorkommt — und zwei Mal in eigenen Worten.
    """
    #: Woraus das Bild entsteht: ``fall`` oder ``baukasten``.
    #:
    #: **Die Wahl gehört der Person, weil es eine Wahl über ihre Texte ist.**
    #:
    #: ``fall``       Ein Sprachmodell liest den Fall und schreibt den Bildauftrag. Dabei
    #:                gehen die eigenen Texte an denselben Anbieter, der sie für Echo, die
    #:                Berichte und den Podcast schon bekommt. Dafür sieht das Bild aus wie
    #:                dieser Fall und nicht wie ein Fall.
    #: ``baukasten``  Nur Zahlen gehen hinaus, und die Bildsprache steht im Katalog. Die
    #:                Bilder sind sich untereinander ähnlicher — das ist der Preis.
    quelle: str = "fall"
    #: Ein Wunsch der Person zum Bild. Leer ist der Normalfall.
    #:
    #: **Der einzige Freitext hier, und er geht nie an das Bildmodell.** Er wird von der
    #: Bildregie GELESEN; was danach hinausgeht, ist der geprüfte Bildauftrag. Ohne diese
    #: Zwischenstufe wäre „zeig, wie er weggeht" die Abbildung eines echten Menschen —
    #: genau deshalb gab es dieses Feld vorher nicht.
    #:
    #: Wirkt nur mit ``quelle = "fall"``: Im Baukasten gibt es nichts zu lesen.
    wunsch: str = Field(default="", max_length=400)
    #: Die Metapher — was das Bild ZEIGT. Von der Person gewählt, nie vom Modell.
    bildwelt: str
    #: Die Handschrift — WIE gemalt wird.
    handschrift: str
    palette: str = "kuehl"
    #: Wie schwer jedes Element wiegt: {"szenen": "viel", "gefuehl": "aus", …}
    #:
    #: **Hier standen Ankreuzfelder.** Das war zu grob für die Frage, die jemand an sein Bild
    #: hat — „meine Momente sollen vorkommen, aber worum es geht, sind die Muster" ist mit
    #: zwei Häkchen nicht sagbar. Was auf ``aus`` steht, wird nicht einmal geladen.
    gewichte: dict[str, str] = Field(default_factory=dict)
    #: Wie abstrakt: konkret · normal · abstrakt.
    abstraktion: str = "normal"
    #: Bis zu drei Stimmungen, die die Person für DIESES Bild will.
    #:
    #: Nicht zu verwechseln mit dem Gefühlsbild: Das ist eine Angabe über den Zustand, das
    #: hier ein Wunsch an das Bild. Beides darf gleichzeitig wahr sein.
    stimmungen: list[str] = Field(default_factory=list)
    #: Kennungen der Szenen, die auf jeden Fall ins Bild sollen.
    #:
    #: Eine Auswahl, die der Zufall danach wieder wegwirft, wäre keine — sie kommt sicher mit.
    szenen: list[str] = Field(default_factory=list)
    #: Wer bei der eigenen Gestalt stehen soll, in eigenen Worten.
    #:
    #: Nur mit ``begleitung = "freitext"``. Geht nie direkt an das Bildmodell: Die Bildregie
    #: liest es und macht eine englische Wendung daraus.
    begleitung_text: str = Field(default="", max_length=200)
    #: Wie deutlich Sinnbilder werden: keine · zurueckhaltend · deutlich.
    symbolik: str = "zurueckhaltend"
    #: Ob die Person selbst vorkommt:
    #:
    #: ``keine``         Es kommt kein Mensch im Bild vor.
    #: ``ich``           Rückenfigur, ohne Gesicht, in Entfernung.
    #: ``ich_sichtbar``  Nah genug, dass man sie ansehen kann — **ihr Aussehen ist frei
    #:                   erfunden**, aus der Selbstauskunft kommen nur Altersspanne und
    #:                   Geschlecht. Deshalb kann die Gestalt der Person nicht ähneln, und
    #:                   deshalb steht das an der Wahl und in der Legende.
    #:
    #: Genau EIN Gesicht darf im Bild sein, und es ist dieses. Andere Menschen dürfen
    #: vorkommen, aber nur fern und undeutlich; die Person, um die es im Fall geht, nie nah
    #: und nie mit Gesicht.
    figur: str = "keine"
    #: Was die Gestalt tut: ``fall`` (der Fall entscheidet) oder eine der fünf Haltungen.
    #:
    #: Eine Haltung ist eine Aussage. Sie aus den Daten abzuleiten wäre eine Deutung in
    #: Bildform — **deshalb ist das Ableiten eine eigene Wahl** und nicht die stille Vorgabe:
    #: Wer sie trifft, hat selbst entschieden, dass der Fall das beantworten darf.
    haltung: str = "fall"
    #: Wer nah bei der eigenen Gestalt steht: keine · fall · freitext.
    #:
    #: Hier standen „kind" und „kinder" — eine Liste, die nur raten konnte. Wer sonst im Leben
    #: eines Menschen vorkommt, steht in seinem Fall und nicht in einem Katalog.
    #:
    #: Handelt der Fall VON einem Kind, kommt gar kein Kind ins Bild: Es wäre genau die
    #: Person, die nicht abgebildet werden darf. Das entscheidet der Server.
    begleitung: str = "keine"


class BildSatz(BaseModel):
    #: Leer setzt zurück. Ein Satz, der sich nicht wieder entfernen lässt, ist eine Falle.
    satz: str = ""

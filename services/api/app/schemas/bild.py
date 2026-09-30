"""Pydantic-Schemas für die Bildwerkstatt."""
from __future__ import annotations

from pydantic import BaseModel, Field


class BildAblegen(BaseModel):
    """Ein fertiges Bild zum Aufheben.

    ``svg`` kommt aus dem Browser — das ist eine Entscheidung mit einer Kehrseite, und sie
    steht im Dienst begründet (``anlegen``): Dafür ist es genau das Bild, das die Person
    gesehen hat; dagegen prüft der Server nicht, was darin steht. Deshalb prüft der Dienst
    Größe und Inhalt oberflächlich.
    """
    #: {"palette":…, "anordnung":…, "dichte":…, "schichten":[…]}
    einstellungen: dict = Field(default_factory=dict)
    svg: str
    #: Der Satz unter dem Bild. Leer ist erlaubt — niemand muss etwas dazu sagen.
    satz: str = ""


class BildMalen(BaseModel):
    """Die Bestellung eines GEMALTEN Bildes.

    **Kein Freitext, und das ist eine Entscheidung.** Beim Podcast gibt es einen — dort führt
    er zu einem Satz mehr über eigenes Erleben. Hier führte er zu einer Gestalt: „zeig, wie er
    weggeht" ist genau die Abbildung eines echten Menschen, die es nicht geben soll. Gesteuert
    werden Handschrift, Farbe und welche Schichten mitgehen.
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
    schichten: list[str] = Field(default_factory=list)
    #: Wie deutlich Sinnbilder werden: keine · zurueckhaltend · deutlich.
    symbolik: str = "zurueckhaltend"
    #: Ob die Person selbst vorkommt: keine · ich (Rückenfigur, ohne Gesicht, in Entfernung).
    #:
    #: Es gibt hoechstens EINE Figur, und sie ist die Person selbst. Eine zweite waere als
    #: die andere Person lesbar — eine Abbildung eines echten Menschen aus den Angaben einer
    #: Seite, und die darf hier nie entstehen.
    figur: str = "keine"
    #: Was die Gestalt tut. Eine Haltung ist eine Aussage — und sie kommt von der Person.
    haltung: str = "stehend"
    #: Wer sonst vorkommt: keine · kind · kinder.
    #:
    #: Der Server prüft, OB das geht: nur wenn die Selbstauskunft Kinder nennt und der Fall
    #: nicht VON einem Kind handelt. Im zweiten Fall wäre die Kindfigur die Fallperson.
    begleitung: str = "keine"


class BildSatz(BaseModel):
    #: Leer setzt zurück. Ein Satz, der sich nicht wieder entfernen lässt, ist eine Falle.
    satz: str = ""

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
    #: Die Metapher — was das Bild ZEIGT. Von der Person gewählt, nie vom Modell.
    bildwelt: str
    #: Die Handschrift — WIE gemalt wird.
    handschrift: str
    palette: str = "kuehl"
    schichten: list[str] = Field(default_factory=list)


class BildSatz(BaseModel):
    #: Leer setzt zurück. Ein Satz, der sich nicht wieder entfernen lässt, ist eine Falle.
    satz: str = ""

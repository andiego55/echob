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


class BildSatz(BaseModel):
    #: Leer setzt zurück. Ein Satz, der sich nicht wieder entfernen lässt, ist eine Falle.
    satz: str = ""

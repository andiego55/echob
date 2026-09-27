"""Pydantic-Schemas für das Podcast-Studio."""
from __future__ import annotations

from pydantic import BaseModel, Field


class PodcastAnlegen(BaseModel):
    """Die Bestellung einer Folge.

    ``gewichte`` kommt als lose Zuordnung Element → Stufe. Geprüft wird sie im Dienst
    (``gewichte_pruefen``) und nicht hier: Welche Elemente erlaubt sind, hängt vom Format
    ab, und ein Schema, das das nachbaut, wäre eine zweite Wahrheit.
    """
    format: str
    laenge: str
    stimme: str
    ansprache: str
    gewichte: dict[str, str] = Field(default_factory=dict)
    #: Kapitel, die nicht vorkommen sollen. Ein Format ist ein Vorschlag, keine Schablone.
    ohne_kapitel: list[str] = Field(default_factory=list)


class PodcastUmbenennen(BaseModel):
    #: Leer setzt zurück — dann zeigt die Oberfläche wieder den Namen des Formats.
    titel: str = ""

"""Datenformen des Kompasses.

Eigene Schemas statt geliehener: Hier gibt es keine ``case_id`` als Pflichtfeld und keine
Fallbezüge im Rückgabewert. Wer später ein Feld aus dem Fallbereich hereinkopiert, soll das
merken, statt es zu erben.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class PulsCreate(BaseModel):
    """Ein Moment. Nur ``zustand`` ist Pflicht — das ist das Versprechen des Raums."""
    zustand: int = Field(ge=1, le=5)
    anspannung: int | None = Field(default=None, ge=0, le=10)
    worte: list[str] = Field(default_factory=list, max_length=10)
    notiz: str | None = Field(default=None, max_length=2000)
    #: „Was hat heute geholfen?" — wird nur bei guten Zuständen gefragt.
    geholfen: str | None = Field(default=None, max_length=500)
    #: „Das war mit …" — freiwillig, und nur ein eigener Fall.
    case_id: UUID | None = None


class Puls(BaseModel):
    id: UUID
    zustand: int
    zustand_label: str | None = None
    anspannung: int | None = None
    worte: list[str] = []
    notiz: str | None = None
    geholfen: str | None = None
    case_id: UUID | None = None
    created_at: datetime


class Krisenplan(BaseModel):
    """Der Plan für den Ernstfall.

    ``inhalt`` ist bewusst frei geformt: Die Abschnitte stehen im Katalog, nicht im
    Schema. Ein neuer Abschnitt ist damit ein Eintrag im Katalog und keine Migration.
    """
    inhalt: dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime | None = None


class KrisenplanUpdate(BaseModel):
    inhalt: dict[str, Any] = Field(default_factory=dict)


class KompassUebersicht(BaseModel):
    """Was die Startseite braucht, in einem Zug."""
    letzter_puls: Puls | None = None
    verlauf: list[Puls] = []
    #: Wie viele Pulse in den letzten Wochen — eine Zahl, keine Serie.
    rhythmus: int = 0
    verlauf_tage: int = 28
    krisenplan_vorhanden: bool = False

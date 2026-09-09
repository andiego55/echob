"""Pydantic-Schemas für das Gefühlsbild."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.services.gefuehlsbild_katalog import (
    FELD_ACHSEN,
    MAX_SZENEN,
    MAX_WORTE,
    MAX_ZEICHEN_BERICHT,
    MAX_ZEICHEN_EIGENES,
    REGLER,
    WORTFELD,
)


class Wort(BaseModel):
    key: str
    label: str


class WortFamilie(BaseModel):
    """Eine Familie mit ihren genaueren Wörtern.

    Die Zweiteilung ist der ganze Trick: Wer belastet ist, hat oft nur das grobe Wort. Er
    tippt die Familie an und bekommt die genaueren — „schlecht" wird zu *beschämt, klein,
    wertlos*.
    """

    key: str
    label: str
    worte: list[Wort]


class Achse(BaseModel):
    key: str
    label: str
    links: str
    rechts: str


#: Wortfeld, Achsen und Regler gehen mit dem Stand ans Frontend, statt dort ein zweites Mal
#: zu stehen. Eine gespiegelte Liste wäre die Stelle, an der beide auseinanderlaufen.
WORTFELD_KATALOG: list[WortFamilie] = [WortFamilie(**f) for f in WORTFELD]
ACHSEN_KATALOG: list[Achse] = [Achse(**a) for a in FELD_ACHSEN]
REGLER_KATALOG: list[Achse] = [Achse(**r) for r in REGLER]


class SzeneKurz(BaseModel):
    slug: str
    title: str | None = None
    wirkungen: list[str] = Field(default_factory=list)


class WortMitFamilie(BaseModel):
    key: str
    label: str
    familie: str


class Gefuehlsbild(BaseModel):
    id: UUID
    status: Literal["entwurf", "bestaetigt"]
    szenen: list[str] = Field(default_factory=list)
    feld: dict[str, int] = Field(default_factory=dict)
    woerter: list[str] = Field(default_factory=list)
    eigenes: str | None = None
    #: Echos Text nach der Bearbeitung durch die Person. Was hier steht, hat sie gebilligt.
    bericht: str | None = None
    created_at: datetime
    updated_at: datetime
    bestaetigt_at: datetime | None = None

    # Aus den Katalogen angereichert, nie aus der Anfrage.
    szenen_titel: list[SzeneKurz] = Field(default_factory=list)
    woerter_labels: list[WortMitFamilie] = Field(default_factory=list)
    #: Der Name der Ecke, in der der Punkt liegt („angespannt, aufgebracht“).
    ecke: str | None = None


class GefuehlsbildSichern(BaseModel):
    """Teile des Entwurfs. ``null`` heißt „nicht angefasst".

    Wichtig für die schrittweise Oberfläche: Ein Schritt, der nur die Wörter schickt, darf
    die vorher gewählten Szenen nicht löschen.
    """

    szenen: list[str] | None = Field(default=None, max_length=MAX_SZENEN)
    feld: dict[str, int] | None = None
    woerter: list[str] | None = Field(default=None, max_length=MAX_WORTE)
    eigenes: str | None = Field(default=None, max_length=MAX_ZEICHEN_EIGENES)
    bericht: str | None = Field(default=None, max_length=MAX_ZEICHEN_BERICHT)


class GefuehlsbildVorschlag(BaseModel):
    """Was Echo geschrieben hat — gespeichert wird davon nichts."""

    bericht: str
    hinweis: str | None = None


class GefuehlsbildStand(BaseModel):
    entwurf: Gefuehlsbild
    verlauf: list[Gefuehlsbild] = Field(default_factory=list)
    wortfeld: list[WortFamilie] = Field(default_factory=list)
    achsen: list[Achse] = Field(default_factory=list)
    regler: list[Achse] = Field(default_factory=list)
    max_szenen: int = MAX_SZENEN
    max_worte: int = MAX_WORTE


def kataloge() -> dict[str, Any]:
    """Die drei Listen, die jede Antwort mitgibt."""
    return {
        "wortfeld": WORTFELD_KATALOG,
        "achsen": ACHSEN_KATALOG,
        "regler": REGLER_KATALOG,
    }

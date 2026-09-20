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

from app.services.kompass_katalog import SATZ_MAX_ZEICHEN


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


# ── Die Sätze über mich ─────────────────────────────────────────────────────
#
# **Warum ``art`` und ``stand`` hier schlichte Zeichenketten sind und keine Literale.**
# Die erlaubten Wörter stehen im Katalog und in der Bedingung der Tabelle. Ein Literal
# hier wäre eine DRITTE Stelle, die mitwandern muss — und genau diese Sorte Fehler hat in
# dieser Codebasis schon dreimal zugeschlagen. Geprüft wird im Dienst gegen den Katalog,
# abgeglichen wird vom Wächter gegen die Datenbank.


class SatzCreate(BaseModel):
    art: str
    text: str = Field(min_length=1, max_length=SATZ_MAX_ZEICHEN)
    #: Woher der Satz kommt. Die Herkunft wird daraus abgeleitet, nicht mitgeschickt —
    #: sonst könnte jemand „von Echo vorgeschlagen" behaupten, was er selbst getippt hat.
    szene_id: UUID | None = None
    puls_id: UUID | None = None


class SatzUpdate(BaseModel):
    """Alles freiwillig — was fehlt, bleibt, wie es war."""
    text: str | None = Field(default=None, max_length=SATZ_MAX_ZEICHEN)
    art: str | None = None
    stand: str | None = None
    angeheftet: bool | None = None


class Satz(BaseModel):
    id: UUID
    art: str
    art_label: str | None = None
    text: str
    stand: str
    herkunft: str
    szene_id: UUID | None = None
    puls_id: UUID | None = None
    angeheftet: bool = False
    #: Woran Echo den Vorschlag festmacht. Nur bei Vorschlägen gesetzt — wer einen Satz
    #: selbst schreibt, muss sich nicht belegen.
    grund: str | None = None
    created_at: datetime
    #: Wann zugestimmt wurde. Gehört sichtbar in die Oberfläche: Ein Satz von vor zwei
    #: Jahren ist etwas anderes als einer von gestern.
    bestaetigt_at: datetime | None = None
    updated_at: datetime


class VorschlagsEntscheidung(BaseModel):
    """Ja oder nein zu einem Vorschlag — mehr gibt es hier nicht zu sagen."""
    annehmen: bool


class VorschlagsLauf(BaseModel):
    """Was ein Lauf ergeben hat.

    ``hinweis`` ist der Satz an die Person, wenn nichts dabei war — „zu wenig Material",
    „liegt noch etwas offen". Eine leere Liste ohne Erklärung sähe aus wie ein Fehler.
    """
    vorschlaege: list[Satz] = []
    hinweis: str | None = None


class KompassUebersicht(BaseModel):
    """Was die Startseite braucht, in einem Zug."""
    letzter_puls: Puls | None = None
    verlauf: list[Puls] = []
    #: Wie viele Pulse in den letzten Wochen — eine Zahl, keine Serie.
    rhythmus: int = 0
    verlauf_tage: int = 28
    krisenplan_vorhanden: bool = False
    #: Wie viele bestätigte Sätze — für die Karte „Sätze über mich".
    saetze_bestaetigt: int = 0

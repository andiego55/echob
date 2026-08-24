"""Schemas: Ehrliches Mitteilen."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class HonestArrive(BaseModel):
    #: Ein Satz, kein Absatz – die Länge ist Teil der Übung.
    body: str = Field(..., max_length=300)


class HonestShare(BaseModel):
    body: str = Field(..., max_length=1500)
    #: Schlüssel aus dem Impuls-Katalog, oder None bei freiem Text. Beides ist richtig.
    impulse: str | None = None


class HonestHeard(BaseModel):
    #: Eine von drei festen Aussagen: gehoert | beruehrt | schwer. Kein Freitext -
    #: sonst wuerde aus der Quittung eine Antwort, und genau die soll es nicht geben.
    kind: str = "gehoert"


class HonestRound(BaseModel):
    id: UUID
    #: arriving | open | closed
    status: str
    created_at: datetime
    closed_at: datetime | None = None


class HonestArrivalOwn(BaseModel):
    body: str
    #: Nur am eigenen Beitrag gesetzt – nie an dem der anderen Person.
    safety: dict | None = None


class HonestArrivalOther(BaseModel):
    body: str
    name: str | None = None


class HonestShareView(BaseModel):
    id: UUID
    is_own: bool
    name: str
    impulse: str | None = None
    impulse_label: str | None = None
    body: str
    heard: bool
    #: Wie es angekommen ist – sichtbar für beide, das ist der Sinn der Quittung.
    heard_as: str | None = None
    heard_as_label: str | None = None
    created_at: datetime
    safety: dict | None = None


class HonestHistoryEntry(BaseModel):
    id: UUID
    created_at: datetime
    closed_at: datetime | None = None
    share_count: int


class HonestRoundView(BaseModel):
    round: HonestRound | None = None
    arrival_own: HonestArrivalOwn | None = None
    arrival_other: HonestArrivalOther | None = None
    #: Ist die andere Person schon angekommen? Sichtbar wird ihr Satz erst, wenn beide da sind.
    arrival_other_done: bool = False
    shares: list[HonestShareView] = []
    my_turn: bool = False
    #: "gehoert" = lies erst · "gegenueber" = die andere ist dran · None = du bist dran
    blocked_reason: str | None = None
    #: Schlüssel → {label, hint}. Die Schreibhilfe steht im Katalog, nicht in der
    #: Oberfläche – sie gehört zur Methode, nicht zum Layout.
    impulses: dict[str, dict[str, str]] = {}
    acknowledgements: dict[str, str] = {}
    #: Die wievielte Runde – damit sich die Übung wie eine Übung anfühlt.
    round_number: int = 1
    partner_name: str | None = None
    history: list[HonestHistoryEntry] = []
    #: Sicherheitshinweis an die SCHREIBENDE Person, sofern der Stichwort-Boden anschlug.
    notice: str | None = None

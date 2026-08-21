"""Schemas: Freigabe eines Paarraums an eine Fachperson.

Freigeben braucht beide, widerrufen genuegt einer - deshalb traegt jede Freigabe die
Liste der bereits erfolgten Zustimmungen mit sich.
Siehe services/couple_professional_service.py.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CoupleShareProposal(BaseModel):
    professional_user_id: UUID
    elements: list[str] = Field(..., min_length=1)
    message: str | None = Field(None, max_length=500)


class CoupleShareElements(BaseModel):
    elements: list[str] = Field(..., min_length=1)


class CoupleProfessionalOption(BaseModel):
    """Eine Fachperson zur Auswahl - nur, WER sie ist, nichts aus dem Fall."""

    professional_user_id: str
    display_name: str
    title: str | None = None


class CoupleShare(BaseModel):
    id: UUID
    couple_id: UUID
    professional_user_id: UUID
    status: str
    #: 'partner' = eine Person hat vorgeschlagen, 'professional' = die Fachperson hat gebeten.
    origin: str
    initiated_by: UUID | None = None
    message: str | None = None
    elements: list[str] = []
    #: Wer bereits zugestimmt hat. Zwei Eintraege = aktiv.
    consented_by: list[str] = []
    consent_names: list[str] = []
    revoked_by: UUID | None = None
    revoked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class CoupleShareView(BaseModel):
    shares: list[CoupleShare]
    #: Zur Auswahl: Fachpersonen mit aktiver Fall-Freigabe dieser Person.
    professionals: list[CoupleProfessionalOption]
    #: Schluessel -> was die Fachperson damit sieht.
    catalogue: dict[str, str]
    #: Vorauswahl beim Vorschlagen.
    defaults: list[str]
    #: Was nie freigegeben werden kann - im Reiter sichtbar aufgezaehlt.
    never: list[str]


# ── Sicht der Fachperson ────────────────────────────────────────────────────


class CoupleRoomSummary(BaseModel):
    """Ein Paarraum in der Liste der Fachperson - ohne jeden Inhalt."""

    id: UUID
    couple_id: UUID
    status: str
    origin: str
    message: str | None = None
    elements: list[str] = []
    #: false = der Raum wurde beendet oder die Freigabe ruht noch.
    readable: bool
    #: Die beiden Personen - damit die Oberflaeche den Raum einem Fall zuordnen kann.
    members: list[CoupleRoomMember] = []
    created_at: datetime
    updated_at: datetime


class CoupleRoomMember(BaseModel):
    user_id: str
    name: str


class CoupleRoomOverview(BaseModel):
    couple_id: str
    members: list[CoupleRoomMember]
    since: datetime
    room_since: datetime
    elements: list[str]
    #: Nur die freigegebenen Elemente, mit Klartext - die Oberflaeche zeigt den Rest gesperrt.
    catalogue: dict[str, str]


class CoupleRoomRequest(BaseModel):
    elements: list[str] = Field(..., min_length=1)
    message: str | None = Field(None, max_length=500)



class CoupleRoomEchoTurn(BaseModel):
    role: str
    content: str


class CoupleRoomEchoRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    #: Der Verlauf kommt aus dem Browser - serverseitig wird nichts abgelegt.
    history: list[CoupleRoomEchoTurn] = []


class CoupleRoomEchoReply(BaseModel):
    reply: str


CoupleRoomSummary.model_rebuild()

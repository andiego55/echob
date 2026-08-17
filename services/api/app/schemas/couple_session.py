"""Schemas: moderierte Sitzungen im Paarraum (Paartherapie Phase 2).

``draft_text`` verlässt den Server nur an die verfassende Person; ``confirmed_text`` ist der
ausdrücklich bestätigte Beitrag, der an Echo geht und im Raum für beide sichtbar ist.
Siehe services/couple_session_service.py.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CoupleSessionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    topic: str | None = Field(None, max_length=4000)
    goal: str | None = Field(None, max_length=1000)


class CoupleSessionUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=160)
    topic: str | None = Field(None, max_length=4000)
    goal: str | None = Field(None, max_length=1000)


class CoupleSessionStatus(BaseModel):
    status: str = Field(..., pattern="^(draft|proposed|open|closed)$")


class CoupleSessionRespond(BaseModel):
    """Antwort auf einen Dialogvorschlag — nur durch die jeweils andere Person."""
    accept: bool


class CoupleSessionSchedule(BaseModel):
    """Die Dialogeinladung: ein Zeitpunkt (oder null, um sie wieder aufzuheben)."""
    scheduled_for: datetime | None = None


class CoupleRephraseRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1500)


class CoupleRephraseResponse(BaseModel):
    """Nur für die anfragende Person — wird nicht gespeichert."""
    suggestion: str


class CoupleSessionResponse(BaseModel):
    id: UUID
    couple_id: UUID
    created_by: UUID
    title: str
    topic: str | None = None
    goal: str | None = None
    status: str
    created_at: datetime
    opened_at: datetime | None = None
    closed_at: datetime | None = None
    proposed_at: datetime | None = None
    accepted_by: UUID | None = None
    accepted_at: datetime | None = None
    declined_at: datetime | None = None
    scheduled_for: datetime | None = None


class CoupleMember(BaseModel):
    user_id: UUID
    name: str


class CoupleSessionMessage(BaseModel):
    id: UUID
    role: str                 # 'partner' | 'echo'
    user_id: UUID | None = None
    speaker: str
    content: str
    created_at: datetime


class CoupleMessageCreate(BaseModel):
    """Ein Beitrag im gemeinsamen Raum — beide sehen ihn."""
    content: str = Field(..., min_length=1, max_length=4000)


class CoupleSharedContext(BaseModel):
    """Ein bestätigter Kontext-Beitrag — im Raum bewusst für beide sichtbar."""
    user_id: UUID
    name: str
    text: str
    mood: str | None = None
    appreciation: str | None = None


class CoupleSessionDetail(BaseModel):
    session: CoupleSessionResponse
    members: list[CoupleMember]
    messages: list[CoupleSessionMessage]
    contexts: list[CoupleSharedContext]


class CoupleContextDraftRequest(BaseModel):
    """Entwurf aus dem EIGENEN Fall erzeugen — die Elementauswahl trifft die Person."""
    case_id: UUID
    elements: list[str] = Field(..., min_length=1)
    focus: str | None = Field(None, max_length=600)


class CoupleContextSave(BaseModel):
    draft_text: str | None = None
    confirmed_text: str | None = None
    instruction: str | None = Field(None, max_length=1000)
    mood: str | None = Field(None, max_length=40)
    appreciation: str | None = Field(None, max_length=600)


class CoupleContextResponse(BaseModel):
    draft_text: str | None = None
    confirmed_text: str | None = None
    instruction: str | None = None
    source_elements: list[str] = []
    confirmed_at: datetime | None = None
    available_elements: dict[str, str] = {}
    max_chars: int
    mood: str | None = None
    appreciation: str | None = None
    moods: dict[str, str] = {}

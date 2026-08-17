"""Schemas: AI-Mediation im Paarraum (Caucus-Modell).

``private_text`` erscheint in einer Antwort ausschließlich bei der eigenen Perspektive
(``is_own``). Fremde vertrauliche Beiträge werden serverseitig gar nicht erst eingesetzt —
siehe services/couple_mediation_service.public_perspective.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CoupleTopicCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    description: str | None = Field(None, max_length=2000)


class CoupleTopicStatus(BaseModel):
    status: str = Field(..., pattern="^(open|resolved)$")


class CoupleTopic(BaseModel):
    id: UUID
    couple_id: UUID
    created_by: UUID
    title: str
    description: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class CouplePerspectiveSave(BaseModel):
    """Der eigene Beitrag. Offen sehen beide, vertraulich liest nur Echo."""
    open_text: str | None = Field(None, max_length=4000)
    private_text: str | None = Field(None, max_length=4000)


class CouplePerspective(BaseModel):
    user_id: UUID
    name: str
    is_own: bool
    open_text: str | None = None
    # Nur bei der eigenen Perspektive gefüllt.
    private_text: str | None = None
    updated_at: datetime


class CoupleMediation(BaseModel):
    id: UUID
    topic_id: UUID
    created_by: UUID
    body: str
    created_at: datetime


class CoupleShareDraft(BaseModel):
    """Ein Text, der geteilt werden KANN — erst das Absenden macht ihn sichtbar."""
    text: str = Field(..., min_length=1, max_length=4000)


class CoupleSessionFromTopic(BaseModel):
    session_id: UUID
    created: bool


class CoupleTopicDetail(BaseModel):
    topic: CoupleTopic
    perspectives: list[CouplePerspective]
    mediations: list[CoupleMediation]
    both_sides_ready: bool

"""Schemas: Paar-Begleiter mit Gesprächsverlauf und Zusammenfassungen.

Alles hier gehört ausschließlich der anfragenden Person — die Partnerperson hat keinen
Endpunkt, über den sie es sehen könnte.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.couple_private import CouplePrivateMessage


class CoupleEchoThread(BaseModel):
    id: UUID
    title: str | None = None
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None
    message_count: int = 0
    summary_count: int = 0


class CoupleEchoConversation(BaseModel):
    """Ein Gespräch samt Verlauf."""
    thread: CoupleEchoThread
    messages: list[CouplePrivateMessage] = []


class CoupleEchoSummary(BaseModel):
    id: UUID
    thread_id: UUID | None = None
    title: str | None = None
    summary_text: str
    created_at: datetime
    updated_at: datetime


class CoupleEchoSummaryEdit(BaseModel):
    title: str | None = Field(None, max_length=160)
    summary_text: str | None = Field(None, min_length=1, max_length=6000)


class CoupleThreadRename(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)

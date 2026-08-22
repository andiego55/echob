"""Schemas: privater, flankierender Echo-Dialog zur Paarsitzung.

Diese Inhalte verlassen den Server ausschließlich an die Person, der sie gehören.
Siehe services/couple_private_service.py.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CouplePrivateMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class CouplePrivateMessage(BaseModel):
    id: UUID
    role: str      # 'user' | 'echo'
    kind: str      # 'chat' | 'feedback'
    content: str
    #: 'acute' | 'elevated', wenn die Sicherheits-Triage eingegriffen hat.
    safety: str | None = None
    created_at: datetime


class CouplePrivateThread(BaseModel):
    messages: list[CouplePrivateMessage]

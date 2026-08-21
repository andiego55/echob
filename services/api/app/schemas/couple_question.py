"""Schemas: die offene Frage an die Partnerperson (Paartherapie).

Siehe services/couple_question_service.py — eine Frage, eine Antwort, kein Faden.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CoupleQuestionCreate(BaseModel):
    question: str = Field(..., min_length=1, max_length=800)


class CoupleQuestionAnswer(BaseModel):
    answer: str = Field(..., min_length=1, max_length=800)


class CoupleQuestion(BaseModel):
    id: UUID
    couple_id: UUID
    question: str
    answer: str | None = None
    status: str
    #: Von mir gestellt — dann warte ich, statt zu antworten.
    is_mine: bool
    #: An mich gerichtet und noch offen. Genau das gehört auf die Übersicht.
    waiting_for_me: bool
    asked_by_name: str
    answered_at: datetime | None = None
    created_at: datetime


class CoupleQuestionList(BaseModel):
    questions: list[CoupleQuestion]
    waiting_for_me: int
    waiting_for_partner: int
    #: Anstöße für den Fall, dass einem die Frage nicht einfällt.
    prompts: list[str]

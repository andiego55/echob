"""Schemas: die wiederkehrenden Anlaesse im Paarraum - Check-in und Wertschaetzung.

Drei Fragen, eine Antwort je Person und Woche. Die Antwort der anderen Person wird erst
sichtbar, wenn man selbst geschrieben hat - deshalb ``visible``.
Siehe services/couple_checkin_service.py.
"""
from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CoupleCheckinSave(BaseModel):
    #: Mehrere sind erlaubt - eine Woche ist selten nur eines.
    moods: list[str] | None = None
    highlight: str | None = Field(None, max_length=600)
    wish: str | None = Field(None, max_length=600)


class CoupleCheckinEntry(BaseModel):
    user_id: str
    name: str
    is_own: bool
    done: bool
    moods: list[str] = []
    highlight: str | None = None
    wish: str | None = None
    #: false = ausgefuellt, aber noch verdeckt, weil du selbst noch nicht dran warst
    visible: bool


class CoupleCheckinWeek(BaseModel):
    week_start: date
    entries: list[CoupleCheckinEntry]
    own_done: bool
    both_done: bool
    questions: dict[str, str]
    moods: dict[str, str]


class CoupleCheckinMood(BaseModel):
    user_id: str
    name: str
    moods: list[str] = []
    is_own: bool


class CoupleCheckinHistoryWeek(BaseModel):
    week_start: date
    moods: list[CoupleCheckinMood]


# ── Wertschaetzung ──────────────────────────────────────────────────────────


class CoupleAppreciationCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=400)


class CoupleAppreciation(BaseModel):
    id: UUID
    from_user_id: UUID
    from_name: str
    is_own: bool
    body: str
    created_at: datetime
    seen_at: datetime | None = None


class CoupleAppreciationWall(BaseModel):
    """Beide Richtungen — was dir dagelassen wurde und was du dagelassen hast."""

    received: list[CoupleAppreciation]
    given: list[CoupleAppreciation]
    unseen: int
    #: Anstoesse fuer den leeren Zettel.
    prompts: list[str]
    partner_name: str | None = None
    max_chars: int


# ── Stimmungsbarometer ──────────────────────────────────────────────────────


class CoupleBarometerSet(BaseModel):
    value: int = Field(..., ge=1, le=10)
    note: str | None = Field(None, max_length=300)


class CoupleBarometerEntry(BaseModel):
    user_id: str | None = None
    name: str
    is_own: bool
    #: None = diese Person hat den Regler noch nie gestellt.
    value: int | None = None
    label: str | None = None
    note: str | None = None
    updated_at: datetime | None = None


class CoupleBarometerPoint(BaseModel):
    value: int
    created_at: datetime


class CoupleBarometerState(BaseModel):
    """Beide Regler nebeneinander. Der Verlauf ist bewusst nur der eigene."""

    entries: list[CoupleBarometerEntry]
    own_history: list[CoupleBarometerPoint]
    levels: dict[str, str]
    note_max_chars: int

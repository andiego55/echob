"""Schemas: Impulse im Paarraum (Paartherapie).

Siehe services/couple_impulse_service.py - Katalog im Code, Antworten in der Datenbank.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class CoupleImpulseAnswer(BaseModel):
    answer: str = Field(..., min_length=1, max_length=1200)


class CoupleImpulseEntry(BaseModel):
    user_id: str
    name: str
    is_own: bool
    done: bool
    answer: str | None = None
    #: false heisst: ausgefuellt, aber noch verdeckt - du warst selbst noch nicht dran.
    visible: bool


class CoupleImpulse(BaseModel):
    slug: str
    title: str
    question: str
    why: str
    duration: str
    group: str
    entries: list[CoupleImpulseEntry]
    own_done: bool
    both_done: bool


class CoupleImpulseOverview(BaseModel):
    impulses: list[CoupleImpulse]
    #: Der naechste, den noch nicht beide gemacht haben - ein Vorschlag, keine Pflicht.
    suggested: str | None = None
    done_count: int
    total: int

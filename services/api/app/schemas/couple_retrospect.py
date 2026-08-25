"""Schemas: Rueckblick ueber Zeit im Paarraum.

Die Statistik wird bei jedem Aufruf frisch gerechnet, Echos Text nur einmal erzeugt und
dann gelesen. Beides gehoert beiden Personen.
Siehe services/couple_retrospect_service.py.
"""
from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CoupleMoodShare(BaseModel):
    mood: str
    anzahl: int


class CoupleRetrospectStats(BaseModel):
    period_start: date
    period_end: date
    days: int
    #: Durchschnitt BEIDER Barometer - nie die Tageskurve der anderen Person.
    barometer_avg: float | None = None
    barometer_avg_before: float | None = None
    barometer_delta: float | None = None
    moods: list[CoupleMoodShare]
    checkin_weeks: int
    sessions_started: int
    sessions_closed: int
    topics_opened: int
    topics_resolved: int
    agreements_made: int
    agreements_kept: int
    agreements_dropped: int
    appreciations: int
    #: Abgeschlossene Runden Ehrliches Mitteilen. Kein Ergebnis – eine Tatsache
    #: über die Praxis, wie die Check-in-Wochen daneben.
    honest_rounds: int = 0
    #: Reicht die Datenlage fuer einen sinnvollen Text?
    has_substance: bool


class CoupleRetrospective(BaseModel):
    id: UUID
    created_by: UUID
    period_start: date
    period_end: date
    body: str
    created_at: datetime


class CoupleRetrospectView(BaseModel):
    stats: CoupleRetrospectStats
    retrospectives: list[CoupleRetrospective]


class CoupleRetrospectCreate(BaseModel):
    days: int = Field(30, ge=14, le=365)

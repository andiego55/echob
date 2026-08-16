"""Schemas: Paar-Tests (beide füllen denselben Test aus und vergleichen).

Der Durchlauf der anderen Person ist erst enthalten, wenn man selbst geantwortet hat —
siehe services/couple_test_service.load_runs.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class CoupleTestSave(BaseModel):
    slug: str = Field(..., min_length=1, max_length=120)
    title: str = Field(..., min_length=1, max_length=200)
    answers: dict[str, Any] = {}
    result: dict[str, Any] = {}


class CoupleTestRun(BaseModel):
    id: UUID
    user_id: UUID
    slug: str
    title: str
    answers: dict[str, Any] = {}
    result: dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime


class CoupleTestComparison(BaseModel):
    id: UUID
    slug: str
    created_by: UUID
    body: str
    created_at: datetime


class CoupleTestState(BaseModel):
    own: CoupleTestRun | None = None
    partner: CoupleTestRun | None = None
    partner_answered: bool = False
    partner_name: str | None = None
    own_name: str = "Du"
    both_done: bool = False
    comparisons: list[CoupleTestComparison] = []


class CoupleTestSummary(BaseModel):
    slug: str
    title: str
    done: int
    mine: bool

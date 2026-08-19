"""Schemas: Sitzungs-Zusammenfassungen und Abmachungen im Paarraum.

Beides gehört beiden Personen und ist im Paarraum für beide sichtbar.
Siehe services/couple_agreement_service.py.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CoupleSummary(BaseModel):
    id: UUID
    session_id: UUID
    created_by: UUID
    summary_text: str
    created_at: datetime


class CoupleAgreementCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=1000)
    session_id: UUID | None = None
    due_at: datetime | None = None


class CoupleAgreementStatus(BaseModel):
    status: str = Field(..., pattern="^(kept|dropped)$")


class CoupleAgreementReview(BaseModel):
    """Die Antwort auf die Nachfrage: ``again`` verschiebt sie um eine Woche."""

    outcome: str = Field(..., pattern="^(kept|again|dropped)$")
    note: str | None = Field(None, max_length=500)


class CoupleAgreement(BaseModel):
    id: UUID
    couple_id: UUID
    session_id: UUID | None = None
    body: str
    proposed_by: UUID
    accepted_by: UUID | None = None
    accepted_at: datetime | None = None
    status: str
    due_at: datetime | None = None
    reviewed_at: datetime | None = None
    review_note: str | None = None
    created_at: datetime
    updated_at: datetime

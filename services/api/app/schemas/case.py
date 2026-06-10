"""Pydantic-Schemas für Fälle (Cases)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

# ── Enums als Literal-Typen ───────────────────────────────────────────────────

RelationshipType = Literal[
    "partner", "ex_partner", "family", "friendship",
    "work", "co_parenting", "other", "own_patterns"
]

RelationshipStatus = Literal[
    "together", "separated", "cohabiting", "low_contact",
    "conflict_laden", "forced_contact", "uncertain"
]

ContactFrequency = Literal[
    "daily", "several_per_week", "occasionally", "rarely",
    "no_contact", "organisational_only", "irregular"
]

# ── Request ───────────────────────────────────────────────────────────────────

class CaseCreate(BaseModel):
    relationship_type: RelationshipType
    relationship_status: RelationshipStatus
    contact_frequency: ContactFrequency
    main_concern: str | None = Field(None, max_length=2000)


class CaseUpdate(BaseModel):
    relationship_type: RelationshipType | None = None
    relationship_status: RelationshipStatus | None = None
    contact_frequency: ContactFrequency | None = None
    main_concern: str | None = Field(None, max_length=2000)
    archived_at: datetime | None = None

# ── Response ──────────────────────────────────────────────────────────────────

class CaseResponse(BaseModel):
    id: UUID
    user_id: UUID
    relationship_type: RelationshipType
    relationship_status: RelationshipStatus
    contact_frequency: ContactFrequency
    main_concern: str | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CaseListResponse(BaseModel):
    cases: list[CaseResponse]
    total: int

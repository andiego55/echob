"""Schemas: Ausbildungsinstitut (eigene Domäne, /institute/*)."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class InstituteRegister(BaseModel):
    """Registrierung eines Ausbildungsinstituts (invite-gated)."""
    name: str = Field(..., min_length=1, max_length=200)
    contact_name: str | None = Field(None, max_length=200)
    access_code: str = Field(..., min_length=1, max_length=100)


class InstituteUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    contact_name: str | None = Field(None, max_length=200)


class InstituteProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    contact_name: str | None = None
    email: str | None = None
    student_quota: int = 0
    example_quota: int = 5
    plan: str = "ausbildung"
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

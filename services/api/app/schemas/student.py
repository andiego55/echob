"""Schemas: Student:in (Ausbildungs-Domäne, /student/*)."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class StudentInviteCreate(BaseModel):
    label: str | None = Field(None, max_length=160)


class StudentInviteAccept(BaseModel):
    token: str | None = None
    code: str | None = None
    display_name: str | None = Field(None, max_length=120)


class StudentProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    institute_id: UUID
    display_name: str | None = None
    status: str = "active"
    created_at: datetime

    model_config = {"from_attributes": True}


class StudentEchoChat(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)


class StudentReportUpdate(BaseModel):
    sections: list[dict] = Field(default_factory=list)

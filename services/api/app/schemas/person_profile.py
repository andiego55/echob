"""Schemas: Personenprofil (Fremdeinschätzung der anderen Person)"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class PersonProfileModuleUpdate(BaseModel):
    module_id: str
    data: dict[str, Any]


class PersonProfileUpdate(BaseModel):
    modules: dict[str, Any] = Field(default_factory=dict)
    summary: dict[str, Any] = Field(default_factory=dict)
    completed_modules: list[str] = Field(default_factory=list)


class PersonProfileResponse(BaseModel):
    id: UUID
    case_id: UUID
    user_id: UUID
    modules: dict[str, Any]
    summary: dict[str, Any]
    completed_modules: list[str]
    summary_text: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SummaryTextUpdate(BaseModel):
    summary_text: str

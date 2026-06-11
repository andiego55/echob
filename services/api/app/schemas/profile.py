"""Pydantic-Schemas für das Beziehungsprofil."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

SafetyStatus = str  # 'no_indication' | 'unclear' | 'heightened_attention' | 'acute_concern'


class ProfileModuleUpdate(BaseModel):
    module_id: str
    data: dict[str, Any]


class ProfileUpdate(BaseModel):
    modules: dict[str, Any] = Field(default_factory=dict)
    summary: dict[str, Any] = Field(default_factory=dict)
    safety_status: SafetyStatus = "no_indication"
    completed_modules: list[str] = Field(default_factory=list)


class ProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    modules: dict[str, Any]
    summary: dict[str, Any]
    safety_status: SafetyStatus
    completed_modules: list[str]
    summary_text: str | None = None
    display_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

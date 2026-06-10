"""Pydantic-Schemas für Beziehungsszenen (Scenes)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

SafetyLevel = Literal["none", "unclear", "elevated", "acute"]
InputMode = Literal["freetext", "guided", "chat"]

# ── Request ───────────────────────────────────────────────────────────────────

class SceneCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    scene_date: date | None = None
    description: str | None = Field(None, max_length=10_000)
    user_reaction: str | None = Field(None, max_length=5_000)
    distress_score: int | None = Field(None, ge=1, le=5)
    safety_level: SafetyLevel = "none"
    pattern_tags: list[str] = Field(default_factory=list)
    input_mode: InputMode = "freetext"


class SceneUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    scene_date: date | None = None
    description: str | None = Field(None, max_length=10_000)
    user_reaction: str | None = Field(None, max_length=5_000)
    distress_score: int | None = Field(None, ge=1, le=5)
    safety_level: SafetyLevel | None = None
    pattern_tags: list[str] | None = None
    confirmed_by_user: bool | None = None


class SceneConfirm(BaseModel):
    """Nutzer bestätigt einen KI-Vorschlag für eine Szene."""
    pattern_tags: list[str] = Field(default_factory=list)
    distress_score: int | None = Field(None, ge=1, le=5)
    safety_level: SafetyLevel = "none"

# ── Response ──────────────────────────────────────────────────────────────────

class SceneResponse(BaseModel):
    id: UUID
    case_id: UUID
    user_id: UUID
    title: str
    scene_date: date | None
    description: str | None
    user_reaction: str | None
    distress_score: int | None
    safety_level: SafetyLevel
    pattern_tags: list[str]
    confirmed_by_user: bool
    input_mode: InputMode
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SceneListResponse(BaseModel):
    scenes: list[SceneResponse]
    total: int

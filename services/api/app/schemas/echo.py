"""Pydantic-Schemas für Echo-Nachrichten und KI-Antworten."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

MessageRole = Literal["user", "assistant", "system"]
ThreadType = Literal["onboarding", "scene", "topic", "glossary", "report"]

# ── Einzel-Nachricht ──────────────────────────────────────────────────────────

class EchoMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=20_000)
    thread_type: ThreadType = "topic"
    related_scene_id: UUID | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class EchoMessageResponse(BaseModel):
    id: UUID
    case_id: UUID
    user_id: UUID
    role: MessageRole
    content: str
    thread_type: ThreadType
    related_scene_id: UUID | None
    metadata: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}

# ── Chat-Request (user schickt Nachricht, Echo antwortet) ─────────────────────

class EchoChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=20_000)
    thread_type: ThreadType = "topic"
    related_scene_id: UUID | None = None
    # Glossarbegriff, der an den Kontext angehängt wird
    glossary_term: str | None = Field(None, max_length=100)


class EchoChatResponse(BaseModel):
    user_message: EchoMessageResponse
    assistant_message: EchoMessageResponse
    # optionale strukturierte Ergebnisse (z.B. extrahierte Szene, Hypothesen)
    structured_result: dict[str, Any] | None = None


# ── Onboarding-Fortschritt ────────────────────────────────────────────────────

class OnboardingAnswer(BaseModel):
    relationship_description: str | None = None
    typical_scenes: str | None = None
    main_burden: str | None = None
    significant_event: str | None = None
    memorable_scenes: str | None = None


class OnboardingResponse(BaseModel):
    case_id: UUID
    answers: OnboardingAnswer
    distress_score: int | None
    safety_status: Literal["none", "unclear", "elevated", "acute"] | None
    pattern_hypotheses: list[dict[str, Any]]
    completed_at: datetime | None

    model_config = {"from_attributes": True}

# ── Musterhypothesen ──────────────────────────────────────────────────────────

class PatternHypothesis(BaseModel):
    label: str                              # z.B. "Schuldumkehr"
    confidence: Literal["low", "medium", "high"]
    source: str                             # "Szene 1, 3", "Onboarding"
    note: str | None = None                 # vorsichtige Formulierung

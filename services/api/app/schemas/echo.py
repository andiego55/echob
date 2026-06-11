"""Pydantic-Schemas für Echo-Nachrichten und KI-Antworten."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

MessageRole = Literal["user", "assistant", "system"]
ThreadType = Literal[
    "onboarding", "scene", "topic", "glossary", "report",
    "topic_self", "topic_person", "topic_responsibility", "topic_guilt",
    "blog_beziehungsmuster", "blog_beobachtung_gefuehl",
    "blog_professionelle_hilfe", "blog_krisentelefone",
]

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
    glossary_term: str | None = Field(None, max_length=100)
    scene_session_id: str | None = Field(None, max_length=100)
    chat_session_id: UUID | None = None     # Session im freien Echo-Chat


class EchoChatResponse(BaseModel):
    user_message: EchoMessageResponse
    assistant_message: EchoMessageResponse
    # optionale strukturierte Ergebnisse (z.B. extrahierte Szene, Hypothesen)
    structured_result: dict[str, Any] | None = None
    # Session, in der die Nachricht gelandet ist (wird bei Bedarf neu angelegt)
    chat_session_id: UUID | None = None


# ── Chat-Sessions (Sidebar im freien Echo-Chat) ───────────────────────────────

class EchoChatSessionResponse(BaseModel):
    id: UUID
    case_id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EchoChatSessionUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)


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

"""Pydantic-Schemas für den Fachpersonenbereich.

Sicherheitsmodell: Fachpersonen sind nicht Eigentümer der Falldaten. Zugriff läuft
über case_shares (+ case_share_elements) und wird serverseitig geprüft (sharing_service).
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

# Freigebbare Element-Typen — Spiegel der DB-CHECK-Constraint in 08_professional.sql
ShareElementType = Literal[
    "case_info", "onboarding", "all_scenes", "scene",
    "scales", "reports", "topic_summaries", "person_profile", "self_profile",
]


# ── Fachpersonen-Profil / Rolle ───────────────────────────────────────────────

class ProfessionalProfileResponse(BaseModel):
    user_id: UUID
    display_name: str | None = None
    title: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfessionalRegister(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=120)
    title: str | None = Field(None, max_length=160)


# ── Einladungen & Verbindungen (nutzerseitig) ─────────────────────────────────

class ProfessionalInviteCreate(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)


class ConnectionResponse(BaseModel):
    """Eine Fachperson-Verbindung aus Sicht der nutzenden Person."""
    email: str
    status: Literal["pending", "accepted"]
    professional_user_id: UUID | None = None
    display_name: str | None = None
    title: str | None = None
    created_at: datetime


class ProfessionalLookupResult(BaseModel):
    professional_user_id: UUID
    display_name: str | None = None
    title: str | None = None


# ── Freigaben (nutzerseitig) ──────────────────────────────────────────────────

class ShareCreate(BaseModel):
    professional_user_id: UUID
    elements: list[ShareElementType] = Field(default_factory=list)
    scene_ids: list[UUID] = Field(default_factory=list)   # nur relevant bei element 'scene'
    message: str | None = Field(None, max_length=2000)


class ShareUpdate(BaseModel):
    elements: list[ShareElementType] = Field(default_factory=list)
    scene_ids: list[UUID] = Field(default_factory=list)
    message: str | None = Field(None, max_length=2000)


class ShareElementResponse(BaseModel):
    element_type: ShareElementType
    scene_id: UUID | None = None


class CaseShareResponse(BaseModel):
    id: UUID
    case_id: UUID
    professional_user_id: UUID
    professional_display_name: str | None = None
    status: Literal["active", "revoked"]
    message: str | None = None
    elements: list[ShareElementResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# ── Postfach / Fallübersicht (Fachperson) ─────────────────────────────────────

class InboxItem(BaseModel):
    share_id: UUID
    case_id: UUID
    client_display_name: str                 # Pseudonym der nutzenden Person
    case_title: str                          # Beziehungstyp-Label
    element_types: list[ShareElementType]
    shared_at: datetime


class ProfessionalCaseSummary(BaseModel):
    share_id: UUID
    case_id: UUID
    case_title: str
    element_types: list[ShareElementType]
    shared_at: datetime


class ProfessionalClientGroup(BaseModel):
    """Eine Klient:in (nutzende Person) mit ihren freigegebenen Fällen."""
    client_display_name: str
    cases: list[ProfessionalCaseSummary]


# ── Notizen der Fachperson ────────────────────────────────────────────────────

class ProfessionalNote(BaseModel):
    first_impressions: str | None = None       # Erste Eindrücke
    key_scenes: str | None = None              # Wichtige Szenen
    open_questions: str | None = None          # Offene Fragen
    conversation_prompts: str | None = None    # Gesprächsimpulse
    next_steps: str | None = None              # Nächste Schritte
    free_text: str | None = None               # Freitext


# ── Glossar ───────────────────────────────────────────────────────────────────

class GlossaryTerm(BaseModel):
    slug: str
    term: str
    definition: str

    model_config = {"from_attributes": True}


# ── Fachpersonen-Echo ─────────────────────────────────────────────────────────

class ProfessionalEchoChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=20_000)
    thread_type: Literal["case", "glossary"] = "case"
    glossary_slug: str | None = Field(None, max_length=100)
    session_id: UUID | None = None


class ProfessionalEchoMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: Literal["user", "assistant", "system"]
    content: str
    thread_type: Literal["case", "glossary"]
    glossary_slug: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfessionalEchoChatResponse(BaseModel):
    user_message: ProfessionalEchoMessageResponse
    assistant_message: ProfessionalEchoMessageResponse
    session_id: UUID


class ProfessionalEchoSessionResponse(BaseModel):
    id: UUID
    case_id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProfessionalEchoSessionUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)


class ProfessionalEchoSummaryCreate(BaseModel):
    session_id: UUID | None = None
    title: str | None = Field(None, max_length=200)
    summary_text: str = Field(..., min_length=1)


class ProfessionalEchoSummaryUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    summary_text: str = Field(..., min_length=1)


class ProfessionalEchoSummaryResponse(BaseModel):
    id: UUID
    case_id: UUID
    session_id: UUID | None
    title: str | None
    summary_text: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

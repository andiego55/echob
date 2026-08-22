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

    # Pseudonym und Avatar der Fallperson. Sie gehoeren in die Onboarding-Antworten und
    # werden von dort gelesen; hier stehen sie, weil man beides schon beim Anlegen
    # vergeben kann. Sonst hiesse der frische Fall in der Uebersicht nur "Partnerschaft"
    # und haette kein Gesicht - und genau die Uebersicht sieht man als erstes wieder.
    # Beides freiwillig; nachtragen geht jederzeit im Onboarding.
    person_name: str | None = Field(None, max_length=120)
    avatar: str | None = Field(None, max_length=16)


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
    # Angereichert in der Listen-Abfrage (Übersichtsseite)
    scene_count: int = 0
    last_activity_at: datetime | None = None
    person_name: str | None = None  # Pseudonym der Fallperson (entschlüsselt aus onboarding_answers)
    avatar: str | None = None        # Fall-Avatar (Emoji, aus onboarding_answers)

    model_config = {"from_attributes": True}


class CaseListResponse(BaseModel):
    cases: list[CaseResponse]
    total: int
    # Aggregat für die Übersichtsseite (Anzahl Echo-Chats des Nutzers)
    chat_session_count: int = 0

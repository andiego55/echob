"""Pydantic-Schemas für Artefakte — festgehaltene Erkenntnisse aus Gesprächen."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.services.case_artifacts import MAX_ZEICHEN_BODY, MAX_ZEICHEN_TITEL

ArtifactStatus = Literal["aktiv", "ueberholt"]


# ── Erzeugung (speichert nichts) ──────────────────────────────────────────────

class ArtifactCandidate(BaseModel):
    """Ein Vorschlag. Wird erst durch Speichern zu einem Artefakt."""

    #: "neu" oder "aktualisierung" — bei letzterem trägt `replaces_id` das Vorhandene.
    art: Literal["neu", "aktualisierung"] = "neu"
    replaces_id: UUID | None = None
    titel: str
    text: str
    #: Ein Satz, warum diese Notiz es wert ist. Wird nicht gespeichert.
    begruendung: str | None = None


class ArtifactSuggestions(BaseModel):
    candidates: list[ArtifactCandidate]
    #: Gesetzt, wenn nichts destilliert werden konnte — mit Grund.
    hinweis: str | None = None


class ArtifactExtractRequest(BaseModel):
    """Aus welchem Gespräch destilliert werden soll."""

    thread_type: str = Field(..., max_length=80)
    #: Nur beim freien Fall-Echo — dort hängt der Verlauf an einer Sitzung.
    chat_session_id: UUID | None = None


# ── Speichern und Pflegen ─────────────────────────────────────────────────────

class CaseArtifactCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=MAX_ZEICHEN_TITEL)
    body: str = Field(..., min_length=1, max_length=MAX_ZEICHEN_BODY)
    source_thread: str | None = Field(None, max_length=80)
    source_session: UUID | None = None
    #: Gesetzt, wenn dieses Artefakt ein vorhandenes ablöst statt danebenzutreten.
    replaces_id: UUID | None = None


class CaseArtifactUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=MAX_ZEICHEN_TITEL)
    body: str | None = Field(None, min_length=1, max_length=MAX_ZEICHEN_BODY)
    #: „gilt nicht mehr" — löscht nicht, sondern macht Bewegung sichtbar.
    status: ArtifactStatus | None = None


# ── Antwort ───────────────────────────────────────────────────────────────────

class CaseArtifactResponse(BaseModel):
    id: UUID
    case_id: UUID
    title: str
    body: str
    source_thread: str | None = None
    source_session: UUID | None = None
    status: ArtifactStatus
    superseded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class CaseArtifactListResponse(BaseModel):
    artifacts: list[CaseArtifactResponse]
    active_count: int
    superseded_count: int
    remaining_slots: int
    max_artifacts: int

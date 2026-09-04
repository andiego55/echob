"""Pydantic-Schemas für Dokumente zum Fallkontext."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.services.case_documents import MAX_ZEICHEN_JE_DOKUMENT

DocumentKind = Literal["brief", "chatverlauf", "nachricht", "notiz", "protokoll", "sonstiges"]


# ── Request ───────────────────────────────────────────────────────────────────

class CaseDocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    kind: DocumentKind = "sonstiges"
    document_date: date | None = None
    description: str | None = Field(None, max_length=2_000)
    # Die Obergrenze steht an EINER Stelle (services/case_documents.py) und wird hier,
    # in der Oberflaeche und in der Datenbank-Constraint darauf bezogen.
    content: str = Field(..., min_length=1, max_length=MAX_ZEICHEN_JE_DOKUMENT)
    source_name: str | None = Field(None, max_length=255)


class CaseDocumentUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    kind: DocumentKind | None = None
    document_date: date | None = None
    description: str | None = Field(None, max_length=2_000)
    active: bool | None = None


# ── Response ──────────────────────────────────────────────────────────────────

class CaseDocumentResponse(BaseModel):
    id: UUID
    case_id: UUID
    title: str
    kind: DocumentKind
    document_date: date | None = None
    description: str | None = None
    content: str
    char_count: int
    source_name: str | None = None
    active: bool
    created_at: datetime
    updated_at: datetime


class CaseDocumentListResponse(BaseModel):
    documents: list[CaseDocumentResponse]
    #: Wie viele noch hineinpassen — die Oberfläche zeigt das, statt erst beim Absenden
    #: abzulehnen.
    remaining_slots: int
    max_documents: int
    max_chars_per_document: int

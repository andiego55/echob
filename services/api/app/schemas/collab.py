"""Schemas: Fachpersonen-Kollaboration (Zuweisungen & Termine)."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AssignmentCreate(BaseModel):
    # Typ: dialog | questionnaire | message | resource (app-seitige Registry)
    type: str
    title: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    template_id: UUID | None = None
    appointment_id: UUID | None = None
    due_at: datetime | None = None


class AssignmentResponseSubmit(BaseModel):
    response: dict[str, Any] = Field(default_factory=dict)


class AppointmentCreate(BaseModel):
    title: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    start_at: datetime
    end_at: datetime | None = None


class AppointmentStatusUpdate(BaseModel):
    status: str                                          # confirmed | cancelled


class MessageSend(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class DialogSummarySubmit(BaseModel):
    summary: str = Field(min_length=1)
    note: str | None = None


class TemplateCreate(BaseModel):
    type: str                                            # questionnaire | resource | message
    title: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class TemplateUpdate(BaseModel):
    title: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class TemplateShare(BaseModel):
    template_id: UUID

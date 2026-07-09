"""Pydantic-Schemas für Berichte (Reports)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

ReportType = Literal["short", "pattern", "coaching_prep", "therapy_prep", "progress", "partner"]
ReportStatus = Literal["draft", "ready", "archived"]

REPORT_TYPE_LABELS: dict[str, str] = {
    "short":         "Kurzbericht",
    "pattern":       "Musterbericht",
    "coaching_prep": "Coaching-Vorbereitung",
    "therapy_prep":  "Therapie-/Beratungsvorbereitung",
    "progress":      "Verlaufsbericht",
    "partner":       "Nachricht für das Gegenüber",
}

REPORT_DISCLAIMER = (
    "Dieser Bericht basiert auf deinen eigenen Angaben und beschreibt mögliche "
    "Beziehungsmuster. Er stellt keine Diagnose dar und ersetzt keine professionelle "
    "psychologische Beratung oder Psychotherapie."
)

# ── Request ───────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    report_type: ReportType
    title: str | None = Field(None, max_length=200)


# ── Response ──────────────────────────────────────────────────────────────────

class ReportResponse(BaseModel):
    id: UUID
    case_id: UUID
    user_id: UUID
    report_type: ReportType
    type_label: str
    title: str | None
    content: dict[str, Any]
    plain_text: str | None
    status: ReportStatus
    disclaimer: str = REPORT_DISCLAIMER
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    reports: list[ReportResponse]
    total: int

"""Pydantic-Schemas für Skalenwerte (Scale Scores)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

ScaleKey = Literal[
    "boundary_violation",      # Grenzverletzung
    "guilt_shifting",          # Schuldumkehr
    "control_isolation",       # Kontrolle & Isolation
    "proximity_distance",      # Nähe-Distanz-Wechsel
    "conflict_escalation",     # Konflikteskalation
    "perception_distortion",   # Wahrnehmungsverunsicherung
    "safety_risk",             # Sicherheitsrisiko
]

SCALE_LABELS: dict[str, str] = {
    "boundary_violation":    "Grenzverletzung",
    "guilt_shifting":        "Schuldumkehr",
    "control_isolation":     "Kontrolle & Isolation",
    "proximity_distance":    "Nähe-Distanz-Wechsel",
    "conflict_escalation":   "Konflikteskalation",
    "perception_distortion": "Wahrnehmungsverunsicherung",
    "safety_risk":           "Sicherheitsrisiko",
}

# ── Response ──────────────────────────────────────────────────────────────────

class ScaleScoreResponse(BaseModel):
    id: UUID
    case_id: UUID
    scale_key: ScaleKey
    label: str
    score: float = Field(..., ge=0, le=5)
    scene_count: int
    confidence: Literal["low", "medium", "high"]
    source_scene_ids: list[UUID]
    notes: str | None
    calculated_at: datetime

    model_config = {"from_attributes": True}


class ScalesOverviewResponse(BaseModel):
    case_id: UUID
    scores: list[ScaleScoreResponse]
    total_scenes: int
    data_quality: Literal["insufficient", "limited", "moderate", "good"]
    disclaimer: str = (
        "Diese Werte beschreiben mögliche Beziehungsmuster auf Basis deiner Angaben. "
        "Sie stellen keine Diagnose dar und ersetzen keine professionelle Beratung."
    )

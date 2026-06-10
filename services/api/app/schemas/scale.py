"""Pydantic-Schemas für Skalenwerte (Scale Scores)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

# ── Skala-Definitionen ────────────────────────────────────────────────────────

SCALE_DEFINITIONS: dict[str, dict[str, Any]] = {
    # Gruppe A: Verhaltensmuster
    "boundary_violation": {
        "label": "Grenzverletzung",
        "group": "behavior",
        "group_label": "Verhaltensmuster",
        "description": "Wie häufig und deutlich werden persönliche Grenzen überschritten?",
        "low_label": "Grenzen werden respektiert",
        "high_label": "Grenzen werden systematisch missachtet",
    },
    "guilt_shifting": {
        "label": "Schuldumkehr",
        "group": "behavior",
        "group_label": "Verhaltensmuster",
        "description": "Wird Schuld auf andere (insb. den Nutzenden) verschoben?",
        "low_label": "Keine Schuldumkehr",
        "high_label": "Systematische Schuldumkehr",
    },
    "control_isolation": {
        "label": "Kontrolle & Isolation",
        "group": "behavior",
        "group_label": "Verhaltensmuster",
        "description": "Werden Aktivitäten, Kontakte oder Entscheidungen kontrolliert?",
        "low_label": "Keine Kontrolle",
        "high_label": "Starke Kontrolle & Isolation",
    },
    "proximity_distance": {
        "label": "Nähe-Distanz-Wechsel",
        "group": "behavior",
        "group_label": "Verhaltensmuster",
        "description": "Schwankt die Verfügbarkeit und Zuneigung unberechenbar?",
        "low_label": "Konstantes Verhalten",
        "high_label": "Extremes Wechselverhalten",
    },
    "conflict_escalation": {
        "label": "Konflikteskalation",
        "group": "behavior",
        "group_label": "Verhaltensmuster",
        "description": "Eskalieren Konflikte schnell und unverhältnismäßig?",
        "low_label": "Konstruktiver Umgang",
        "high_label": "Starke Eskalationstendenz",
    },
    "perception_distortion": {
        "label": "Realitätsverzerrung",
        "group": "behavior",
        "group_label": "Verhaltensmuster",
        "description": "Wird die Wahrnehmung des Nutzenden in Frage gestellt?",
        "low_label": "Keine Verzerrung",
        "high_label": "Systematisches Gaslighting",
    },
    "safety_risk": {
        "label": "Sicherheitsrisiko",
        "group": "behavior",
        "group_label": "Verhaltensmuster",
        "description": "Gibt es Hinweise auf physische oder psychische Gefährdung?",
        "low_label": "Kein erkennbares Risiko",
        "high_label": "Erhebliches Sicherheitsrisiko",
    },
    # Gruppe B: Persönlichkeitsprofil (Big 5, auf Fallperson bezogen)
    "personality_openness": {
        "label": "Offenheit",
        "group": "personality",
        "group_label": "Persönlichkeitsprofil (Fallperson)",
        "description": "Offenheit für andere Perspektiven und Feedback.",
        "low_label": "Starres Denken",
        "high_label": "Sehr offen & flexibel",
    },
    "personality_conscientiousness": {
        "label": "Zuverlässigkeit",
        "group": "personality",
        "group_label": "Persönlichkeitsprofil (Fallperson)",
        "description": "Verlässlichkeit, Beständigkeit und Folgen von Absprachen.",
        "low_label": "Sehr unzuverlässig",
        "high_label": "Sehr verlässlich",
    },
    "personality_extraversion": {
        "label": "Dominanz & Präsenz",
        "group": "personality",
        "group_label": "Persönlichkeitsprofil (Fallperson)",
        "description": "Wie dominant und raumfüllend tritt die Person auf?",
        "low_label": "Zurückhaltend",
        "high_label": "Sehr dominant",
    },
    "personality_agreeableness": {
        "label": "Kooperationsbereitschaft",
        "group": "personality",
        "group_label": "Persönlichkeitsprofil (Fallperson)",
        "description": "Bereitschaft zu Kompromissen und konstruktiver Zusammenarbeit.",
        "low_label": "Konfliktsuchend",
        "high_label": "Sehr kooperativ",
    },
    "personality_neuroticism": {
        "label": "Emotionale Instabilität",
        "group": "personality",
        "group_label": "Persönlichkeitsprofil (Fallperson)",
        "description": "Schwankungen in Stimmung und emotionaler Reaktion.",
        "low_label": "Emotional stabil",
        "high_label": "Stark instabil",
    },
    # Gruppe C: Beziehungsdynamik
    "responsibility_deflection": {
        "label": "Verantwortungsabwehr",
        "group": "dynamics",
        "group_label": "Beziehungsdynamik",
        "description": "Wird Verantwortung für eigenes Verhalten übernommen oder abgewehrt?",
        "low_label": "Übernimmt Verantwortung",
        "high_label": "Weist jede Verantwortung ab",
    },
    "cluster_b_traits": {
        "label": "Cluster-B-Merkmale",
        "group": "dynamics",
        "group_label": "Beziehungsdynamik",
        "description": "Muster, die narzisstischen, Borderline-, antisozialen oder histrionischen Störungen ähneln.",
        "low_label": "Keine Anzeichen",
        "high_label": "Starke Anzeichen",
    },
    "empathy_deficit": {
        "label": "Empathiemangel",
        "group": "dynamics",
        "group_label": "Beziehungsdynamik",
        "description": "Fähigkeit und Bereitschaft, die Perspektive und Gefühle anderer wahrzunehmen.",
        "low_label": "Ausgeprägte Empathie",
        "high_label": "Deutlicher Empathiemangel",
    },
}

SCALE_LABELS: dict[str, str] = {k: v["label"] for k, v in SCALE_DEFINITIONS.items()}

ScaleKey = Literal[
    "boundary_violation",
    "guilt_shifting",
    "control_isolation",
    "proximity_distance",
    "conflict_escalation",
    "perception_distortion",
    "safety_risk",
    "personality_openness",
    "personality_conscientiousness",
    "personality_extraversion",
    "personality_agreeableness",
    "personality_neuroticism",
    "responsibility_deflection",
    "cluster_b_traits",
    "empathy_deficit",
]

GROUP_ORDER = ["behavior", "personality", "dynamics"]


# ── Response-Modelle ──────────────────────────────────────────────────────────

class ScaleScoreResponse(BaseModel):
    id: UUID
    case_id: UUID
    scale_key: str
    label: str
    score: float = Field(..., ge=0, le=100)
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
        "Sie stellen keine Diagnose dar und ersetzen keine professionelle Beratung. "
        "Persönlichkeitsmerkmale (Gruppe B) sind Einschätzungen aus deiner Perspektive."
    )

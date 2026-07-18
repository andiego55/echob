"""Schemas: Ausbildungsinstitut (eigene Domäne, /institute/*)."""
from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.case import ContactFrequency, RelationshipStatus, RelationshipType


class InstituteRegister(BaseModel):
    """Registrierung eines Ausbildungsinstituts (invite-gated)."""
    name: str = Field(..., min_length=1, max_length=200)
    contact_name: str | None = Field(None, max_length=200)
    access_code: str = Field(..., min_length=1, max_length=100)


class InstituteUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    contact_name: str | None = Field(None, max_length=200)


class InstituteProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    contact_name: str | None = None
    email: str | None = None
    student_quota: int = 0
    example_quota: int = 5
    plan: str = "ausbildung"
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── KI-Fallgenerierung ────────────────────────────────────────────────────────

class GenerationInput(BaseModel):
    """Rahmen-Eingaben des Ausbilders für einen prototypischen Beispielfall."""
    title: str | None = Field(None, max_length=200)
    person_name: str = Field(..., min_length=1, max_length=120)       # Pseudonym Fallperson
    relationship_type: RelationshipType
    relationship_status: RelationshipStatus
    contact_frequency: ContactFrequency
    distress_score: int = Field(3, ge=0, le=5)
    free_text: str | None = Field(None, max_length=4000)              # sonstige Angaben zur Beziehung
    focus_terms: list[str] = Field(default_factory=list)             # Schwerpunkte, die die Beziehung prägen
    scene_count: int = Field(12, ge=3, le=30)
    with_partner: bool = False
    partner_name: str | None = Field(None, max_length=120)            # Pseudonym Partnerperson


class ExamplePatch(BaseModel):
    title: str | None = Field(None, max_length=200)
    status: str | None = Field(None, pattern="^(draft|published|archived)$")
    master_solution: str | None = Field(None, max_length=40_000)


class AssignStudents(BaseModel):
    student_ids: list[UUID] = Field(default_factory=list)


class SubmissionFeedback(BaseModel):
    feedback: str | None = Field(None, max_length=8000)
    rubric_id: UUID | None = None
    scores: list[dict] = Field(default_factory=list)
    total_points: float | None = None


class RubricCriterion(BaseModel):
    key: str = Field(..., min_length=1, max_length=60)
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)
    max_points: int = Field(..., ge=1, le=100)


class RubricUpsert(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    criteria: list[RubricCriterion] = Field(default_factory=list)


class SubmissionEvaluate(BaseModel):
    rubric_id: UUID


class AssignmentUpsert(BaseModel):
    kind: str = Field(..., pattern="^(task|reflection|resource)$")
    title: str = Field(..., min_length=1, max_length=200)
    instructions: str | None = Field(None, max_length=8000)
    link: str | None = Field(None, max_length=1000)          # resource
    rubric_id: UUID | None = None
    status: str = Field("published", pattern="^(draft|published|archived)$")
    due_on: date | None = None


class AssignmentAssign(BaseModel):
    student_ids: list[UUID] = Field(default_factory=list)
    to_all: bool = False


class StudentAssignmentReview(BaseModel):
    feedback: str | None = Field(None, max_length=8000)
    scores: list[dict] = Field(default_factory=list)
    total_points: float | None = None


class InstituteEchoSettings(BaseModel):
    echo_approach: str | None = None
    echo_tone: int | None = None
    echo_depth: int | None = None
    echo_custom_steering: str | None = Field(None, max_length=600)


class ModuleUpsert(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=4000)
    didactic_guide: str | None = Field(None, max_length=20_000)
    status: str = Field("draft", pattern="^(draft|published|archived)$")
    sellable: bool = False


class ModuleStepUpsert(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str | None = Field(None, max_length=40_000)
    kind: str = Field("lesson", pattern="^(lesson|case|assignment|quiz)$")
    ref_id: UUID | None = None
    payload: dict = Field(default_factory=dict)


class ModuleStepReorder(BaseModel):
    step_ids: list[UUID] = Field(default_factory=list)

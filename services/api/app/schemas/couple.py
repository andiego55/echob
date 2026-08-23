"""Schemas: Paartherapie (peer-to-peer) — Kopplung zweier Nutzer:innen.

Eine Person erzeugt eine Einladung (Kopplungscode), die andere nimmt sie an; beide
teilen sich danach einen Paarraum. Eine Kopplung ist KEINE Freigabe: sie gewährt
keinerlei Zugriff auf Fall-Inhalte der jeweils anderen Person. Entsprechend enthalten
diese Schemas bewusst keine Fall-Daten — nur Kopplungs-Metadaten.
Siehe services/couple_therapy_service.py.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CoupleLinkCreate(BaseModel):
    """Einladung erzeugen. Der Anker-Fall ist nur Herkunft/Bezug — kein Datenzugriff."""
    case_id: UUID | None = None


class CoupleLinkCaseUpdate(BaseModel):
    """Welcher eigene Fall zu diesem Paarraum gehoert — oder keiner mehr (None).

    Reine Herkunftsangabe, KEIN Datenzugriff: Sie entscheidet nur, wohin eine im
    Paarraum entstandene Szene gespeichert werden darf.
    """

    case_id: UUID | None = None


class CoupleLinkAccept(BaseModel):
    """Einladung per Kopplungscode annehmen (optional mit eigenem Anker-Fall)."""
    code: str = Field(..., min_length=4, max_length=32)
    case_id: UUID | None = None


class CoupleLinkResponse(BaseModel):
    """Sicht einer Person auf ihren Paarraum bzw. ihre Einladung.

    ``invite_code`` wird nur ausgeliefert, solange die Einladung offen ist.
    ``partner_display_name`` ist der selbstgewählte Anzeigename — keine Fall-Daten.
    """
    id: UUID
    status: str
    role: str                                  # 'initiator' | 'partner'
    invite_code: str | None = None
    case_id: UUID | None = None                # eigener Anker-Fall
    partner_display_name: str | None = None
    partner_avatar: str | None = None
    partner_connected: bool = False
    created_at: datetime
    accepted_at: datetime | None = None


class CoupleLinkAcceptResponse(BaseModel):
    connected: bool
    already: bool = False
    couple_id: UUID | None = None


class CoupleMemberPoints(BaseModel):
    user_id: UUID
    name: str
    points: int


class CoupleMilestone(BaseModel):
    key: str
    title: str
    description: str
    reached: bool


class CoupleProgressEvent(BaseModel):
    kind: str
    label: str
    points: int
    name: str
    created_at: datetime


class CoupleLevel(BaseModel):
    name: str
    next_at: int | None = None
    next_name: str | None = None


class CoupleProgress(BaseModel):
    """Fortschritt eines Paarraums — eigene UND gemeinsame Punkte, bewusst ohne Rangliste."""
    total_points: int
    own_points: int
    members: list[CoupleMemberPoints]
    streak_weeks: int
    level: CoupleLevel
    milestones: list[CoupleMilestone]
    recent: list[CoupleProgressEvent]


class CoupleDashboardItem(BaseModel):
    """Ein Eintrag im Dashboard — entweder wartet er auf dich oder auf die andere Person."""
    kind: str
    title: str
    detail: str
    target: str | None = None


class CoupleDashboardSession(BaseModel):
    id: UUID
    title: str
    status: str
    scheduled_for: datetime | None = None
    message_count: int
    has_summary: bool
    from_topic: bool = False


class CoupleDashboardTopic(BaseModel):
    id: UUID
    title: str
    status: str
    message_count: int
    has_mediation: bool
    open_bridges: int


class CoupleAgreementSnippet(BaseModel):
    id: UUID
    body: str
    status: str


class CoupleAgreementSummary(BaseModel):
    proposed: int
    active: int
    kept: int
    recent: list[CoupleAgreementSnippet] = []


class CoupleEchoSummarySnippet(BaseModel):
    """Eigene Begleiter-Zusammenfassung für die Übersicht."""
    id: UUID
    title: str | None = None
    summary_text: str
    created_at: datetime


class CoupleDashboard(BaseModel):
    """Was im Paarraum gerade dran ist — serverseitig sortiert nach „wer ist am Zug“."""
    partner_name: str | None = None
    partner_avatar: str | None = None
    own_name: str = "Du"
    own_avatar: str | None = None
    echo_summaries: list[CoupleEchoSummarySnippet] = []
    attention: list[CoupleDashboardItem] = []
    waiting_for_partner: list[CoupleDashboardItem] = []
    sessions: list[CoupleDashboardSession] = []
    topics: list[CoupleDashboardTopic] = []
    agreements: CoupleAgreementSummary
    progress: CoupleProgress


class CoupleInvitePublic(BaseModel):
    """Minimal-Sicht auf einen Kopplungscode — bewusst ohne Namen oder Inhalte."""
    valid: bool
    status: str

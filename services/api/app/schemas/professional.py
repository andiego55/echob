"""Pydantic-Schemas für den Fachpersonenbereich.

Sicherheitsmodell: Fachpersonen sind nicht Eigentümer der Falldaten. Zugriff läuft
über case_shares (+ case_share_elements) und wird serverseitig geprüft (sharing_service).
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

# Freigebbare Element-Typen — Spiegel der DB-CHECK-Constraint in 08_professional.sql
ShareElementType = Literal[
    "case_info", "onboarding", "all_scenes", "scene",
    "scales", "reports", "topic_summaries", "person_profile", "self_profile",
    "hypotheses",
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
    is_demo: bool = False                    # Beispielfall / Spielwiese


class ProfessionalCaseSummary(BaseModel):
    share_id: UUID
    case_id: UUID
    case_title: str
    element_types: list[ShareElementType]
    shared_at: datetime
    is_demo: bool = False                    # Beispielfall / Spielwiese


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


# ── Fachpersonen-Berichte (Reports) ───────────────────────────────────────────

PRO_REPORT_DISCLAIMER = (
    "Dieser Bericht ist eine KI-gestützte fachliche Einschätzung auf Basis des freigegebenen "
    "Materials und der Notizen, Hypothesen und Zusammenfassungen der Fachperson. Er kann "
    "wahrscheinlichkeits- und merkmalsbasierte Überlegungen zu Störungsbildern enthalten, stellt "
    "jedoch keine klinische Diagnose dar, ist fachlich zu validieren und nicht zur Weitergabe als "
    "Diagnose an die Klient:in bestimmt."
)

# Eingebaute Standardberichte — Spiegel von services/pro_report_templates.py
StandardReportKey = Literal["verlauf", "uebergabe", "standort", "couple"]


# ── Eigene Berichtsvorlagen ───────────────────────────────────────────────────

class ProReportTemplate(BaseModel):
    id: UUID
    name: str
    instruction: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProReportTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    instruction: str = Field(..., min_length=1, max_length=8000)


class ProReportTemplateUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    instruction: str = Field(..., min_length=1, max_length=8000)


class ProReportTemplateAssistRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=4000)


class ProReportTemplateAssistResponse(BaseModel):
    instruction: str


# ── Generierte Berichte ───────────────────────────────────────────────────────

class ProfessionalReportCreate(BaseModel):
    source: Literal["standard", "template"]
    standard_key: StandardReportKey | None = None
    template_id: UUID | None = None
    title: str | None = Field(None, max_length=200)


class ProfessionalReportUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    sections: list[dict[str, Any]] | None = None


class ProfessionalReportListItem(BaseModel):
    """Schlanke Listendarstellung (ohne content) für die Berichtsübersicht im Fall."""
    id: UUID
    case_id: UUID
    source: str
    template_id: UUID | None = None
    title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProfessionalReport(BaseModel):
    id: UUID
    case_id: UUID
    source: str
    template_id: UUID | None = None
    title: str | None
    content: dict[str, Any]                 # {"sections":[{heading,text}], "disclaimer": str}
    disclaimer: str = PRO_REPORT_DISCLAIMER
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Sitzungsnotizen + Notiz-Vorlagen ──────────────────────────────────────────

class NoteTemplate(BaseModel):
    id: str                                # 'builtin:<key>' oder UUID (eigene)
    name: str
    fields: list[str]                      # Abschnitts-Überschriften
    builtin: bool = False


class NoteTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    fields: list[str] = Field(..., min_length=1, max_length=30)


class NoteTemplateUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    fields: list[str] = Field(..., min_length=1, max_length=30)


class SessionNoteCreate(BaseModel):
    session_date: date | None = None
    title: str | None = Field(None, max_length=200)
    sections: list[dict[str, Any]] = Field(default_factory=list)


class SessionNoteUpdate(BaseModel):
    session_date: date | None = None
    title: str | None = Field(None, max_length=200)
    sections: list[dict[str, Any]] | None = None


class SessionNote(BaseModel):
    id: UUID
    case_id: UUID
    session_date: date
    title: str | None
    content: dict[str, Any]                 # {"sections":[{heading,text}]}
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Organisation / Praxis ─────────────────────────────────────────────────────

OrgRole = Literal["owner", "admin", "member"]


class OrgMember(BaseModel):
    user_id: UUID
    display_name: str | None = None
    email: str | None = None
    role: OrgRole


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    plan: str
    role: OrgRole                            # eigene Rolle in der Praxis
    members: list[OrgMember]


class OrgInviteResponse(BaseModel):
    id: UUID
    org_name: str
    email: str
    status: Literal["pending", "accepted"]
    created_at: datetime


class OrgRename(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)


class OrgMemberInvite(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)


class OrgRoleUpdate(BaseModel):
    role: Literal["admin", "member"]        # owner-Rolle nicht über diesen Weg setzbar


# ── Org-Abrechnung (Phase 3) ──────────────────────────────────────────────────

class OrgCheckoutRequest(BaseModel):
    tier: Literal["solo", "praxis", "institut"]


class OrgBillingStatus(BaseModel):
    plan: str                               # free/solo/praxis/institut
    status: str | None                      # Stripe-Abo-Status
    subscription_active: bool               # active/trialing
    active_cases: int                       # aktivierte (nicht-Demo) Sitze der Org
    included: int                           # Inklusiv-Kontingent des Tarifs
    role: OrgRole
    configured: bool                        # Stripe verfügbar?


# ── Paar-Analyse (gekoppelte Fälle) ──────────────────────────────────────────

class CoupleCreateRequest(BaseModel):
    case_id_a: UUID
    case_id_b: UUID


class CoupleResponse(BaseModel):
    id: UUID
    case_id_a: UUID
    case_id_b: UUID
    is_demo: bool
    created_at: datetime


class CaseCoupleStatus(BaseModel):
    coupled: bool
    couple_id: UUID | None = None
    partner_case_id: UUID | None = None


class CoupleEchoChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=20_000)
    thread_type: Literal["couple", "glossary"] = "couple"
    glossary_slug: str | None = Field(None, max_length=100)
    session_id: UUID | None = None


class CoupleEchoMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: Literal["user", "assistant"]
    content: str
    thread_type: str
    glossary_slug: str | None = None
    created_at: datetime


class CoupleEchoChatResponse(BaseModel):
    user_message: CoupleEchoMessageResponse
    assistant_message: CoupleEchoMessageResponse
    session_id: UUID


class CoupleEchoSessionResponse(BaseModel):
    id: UUID
    couple_id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime


class CoupleGlossaryTerm(BaseModel):
    slug: str
    term: str
    definition: str


class CoupleMeta(BaseModel):
    suggested_questions: list[str]
    glossary: list[CoupleGlossaryTerm]


class CoupleReportCreate(BaseModel):
    source: Literal["standard", "template"] = "standard"
    template_id: UUID | None = None
    title: str | None = Field(None, max_length=200)


class CoupleReportListItem(BaseModel):
    id: UUID
    couple_id: UUID
    source: str
    template_id: UUID | None = None
    title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CoupleReport(BaseModel):
    id: UUID
    couple_id: UUID
    source: str
    template_id: UUID | None = None
    title: str | None
    content: dict[str, Any]
    disclaimer: str = PRO_REPORT_DISCLAIMER
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Aktivierungs-Historie (Abrechnung) ────────────────────────────────────────

class ActivationLogEntry(BaseModel):
    case_id: UUID
    client_name: str | None = None
    relationship_type: str | None = None
    professional_name: str | None = None
    billing_period_start: datetime
    activated_at: datetime
    released_at: datetime | None = None
    release_reason: str | None = None

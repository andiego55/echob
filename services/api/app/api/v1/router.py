"""
API v1 – Zentraler Router.

Hier werden alle v1-Router registriert.
Neue Router einfach importieren und mit include_router() hinzufügen.
"""
from fastapi import APIRouter

from app.api.v1.routers import (
    account,
    case_shares,
    cases,
    client_invites,
    echo,
    health,
    hypotheses,
    inbox,
    onboarding,
    org_billing,
    organizations,
    person_profile,
    professional,
    professional_collab,
    professional_echo,
    professional_notes,
    professional_reports,
    professional_templates,
    professionals,
    profile,
    pseudonymous,
    reports,
    reviews,
    scales,
    scenes,
    subscription,
    topic_summaries,
    waitlist,
)

v1_router = APIRouter()

# ── System ───────────────────────────────────────────────────────────────────
v1_router.include_router(health.router)

# ── Phase 0: Warteliste ───────────────────────────────────────────────────────
v1_router.include_router(waitlist.router)

# ── Phase 1: Kern-App ─────────────────────────────────────────────────────────
v1_router.include_router(cases.router)
v1_router.include_router(scenes.router)
v1_router.include_router(echo.router)
v1_router.include_router(scales.router)
v1_router.include_router(reports.router)
v1_router.include_router(reviews.router)
v1_router.include_router(profile.router)
v1_router.include_router(account.router)
v1_router.include_router(person_profile.router)
v1_router.include_router(topic_summaries.router)
v1_router.include_router(hypotheses.router)
v1_router.include_router(onboarding.router)
v1_router.include_router(subscription.router)
v1_router.include_router(inbox.router)

# ── Fachpersonenbereich ───────────────────────────────────────────────────────
v1_router.include_router(professional.router)
v1_router.include_router(professionals.router)
v1_router.include_router(organizations.router)
v1_router.include_router(org_billing.router)
v1_router.include_router(case_shares.router)
v1_router.include_router(client_invites.router)
v1_router.include_router(pseudonymous.router)
v1_router.include_router(professional_echo.router)
v1_router.include_router(professional_collab.router)
v1_router.include_router(professional_notes.router)
v1_router.include_router(professional_reports.router)
v1_router.include_router(professional_templates.router)

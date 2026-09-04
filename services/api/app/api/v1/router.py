"""
API v1 – Zentraler Router.

Hier werden alle v1-Router registriert.
Neue Router einfach importieren und mit include_router() hinzufügen.
"""
from fastapi import APIRouter

from app.api.v1.routers import (
    account,
    case_artifacts,
    case_documents,
    case_shares,
    cases,
    client_invites,
    contact,
    couple,
    couple_agreements,
    couple_honest,
    couple_impulses,
    couple_mediation,
    couple_private,
    couple_questions,
    couple_reminders,
    couple_retrospect,
    couple_rhythm,
    couple_sessions,
    couple_shares,
    couple_tests,
    directory,
    directory_admin,
    directory_profile,
    echo,
    health,
    hypotheses,
    inbox,
    institute,
    notifications,
    onboarding,
    org_billing,
    organizations,
    person_profile,
    professional,
    professional_collab,
    professional_couple_room,
    professional_couples,
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
    student,
    subscription,
    test_results,
    topic_summaries,
    waitlist,
)

v1_router = APIRouter()

# ── System ───────────────────────────────────────────────────────────────────
v1_router.include_router(health.router)

# ── Phase 0: Warteliste + Kontakt ─────────────────────────────────────────────
v1_router.include_router(waitlist.router)
v1_router.include_router(contact.router)

# ── Fachpersonen-Verzeichnis (öffentlich, "Fachperson finden") ─────────────────
v1_router.include_router(directory.router)
v1_router.include_router(directory_profile.router)  # authentifiziert: /directory/me
v1_router.include_router(directory_admin.router)    # nur Admin: /directory/admin

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
v1_router.include_router(test_results.router)
v1_router.include_router(hypotheses.router)
v1_router.include_router(onboarding.router)
v1_router.include_router(subscription.router)
v1_router.include_router(inbox.router)
v1_router.include_router(notifications.router)

# ── Fachpersonenbereich ───────────────────────────────────────────────────────
v1_router.include_router(professional.router)
v1_router.include_router(professionals.router)
v1_router.include_router(organizations.router)
v1_router.include_router(org_billing.router)
v1_router.include_router(case_artifacts.router)
v1_router.include_router(case_documents.router)
v1_router.include_router(case_shares.router)
v1_router.include_router(client_invites.router)
v1_router.include_router(pseudonymous.router)
v1_router.include_router(professional_echo.router)
v1_router.include_router(professional_couples.router)
v1_router.include_router(professional_couple_room.router)
v1_router.include_router(professional_collab.router)
v1_router.include_router(professional_notes.router)
v1_router.include_router(professional_reports.router)
v1_router.include_router(professional_templates.router)

# ── Paartherapie (peer-to-peer, zwei Nutzer:innen) ────────────────────────────
v1_router.include_router(couple.router)
v1_router.include_router(couple_sessions.router)
v1_router.include_router(couple_private.router)
v1_router.include_router(couple_agreements.router)
v1_router.include_router(couple_mediation.router)
v1_router.include_router(couple_tests.router)
v1_router.include_router(couple_rhythm.router)
v1_router.include_router(couple_retrospect.router)
v1_router.include_router(couple_honest.router)
v1_router.include_router(couple_questions.router)
v1_router.include_router(couple_impulses.router)
v1_router.include_router(couple_reminders.router)
v1_router.include_router(couple_shares.router)

# ── Ausbildungsbereich (Institute + Student:innen) ────────────────────────────
v1_router.include_router(institute.router)
v1_router.include_router(student.router)

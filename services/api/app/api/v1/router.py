"""
API v1 – Zentraler Router.

Hier werden alle v1-Router registriert.
Neue Router einfach importieren und mit include_router() hinzufügen.
"""
from fastapi import APIRouter
from app.api.v1.routers import health, waitlist, cases, scenes, echo, scales, reports, profile, person_profile

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
v1_router.include_router(profile.router)
v1_router.include_router(person_profile.router)

"""
API v1 – Zentraler Router.

Hier werden alle v1-Router registriert.
Neue Router einfach importieren und mit include_router() hinzufügen.
"""
from fastapi import APIRouter
from app.api.v1.routers import health, waitlist

# Zukünftige Router – auskommentiert bis zur jeweiligen Phase:
# from app.api.v1.routers import onboarding
# from app.api.v1.routers import cases
# from app.api.v1.routers import events
# from app.api.v1.routers import chat
# from app.api.v1.routers import reports

v1_router = APIRouter()

# ── System ──────────────────────────────────────────────────────────────────
v1_router.include_router(health.router, tags=["System"])

# ── Phase 0 ─────────────────────────────────────────────────────────────────
v1_router.include_router(waitlist.router, tags=["Warteliste"])

# ── Phase 1 (später aktivieren) ──────────────────────────────────────────────
# v1_router.include_router(onboarding.router, tags=["Onboarding"])

# ── Phase 2 ──────────────────────────────────────────────────────────────────
# v1_router.include_router(cases.router,  prefix="/cases",  tags=["Nutzerfälle"])
# v1_router.include_router(events.router, prefix="/events", tags=["Ereignisse"])

# ── Phase 3 ──────────────────────────────────────────────────────────────────
# v1_router.include_router(chat.router, prefix="/chat", tags=["Reflexionsdialog"])

# ── Phase 4 ──────────────────────────────────────────────────────────────────
# v1_router.include_router(reports.router, prefix="/reports", tags=["Reports"])

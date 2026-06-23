"""Router: Org-Abrechnung + Fall-Aktivierung (Sitze) — /professional

Phase 3: Profi-Werkzeuge liegen hinter einem aktiven Org-Abo + aktiviertem Fall.
Checkout/Portal spiegeln die B2C-Flows (billing_service); Org-Erkennung via metadata.org_id.
"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_professional, get_pool
from app.schemas.professional import OrgBillingStatus, OrgCheckoutRequest
from app.schemas.subscription import (
    CheckoutResponse,
    CheckoutVerifyRequest,
    CheckoutVerifyResponse,
    PortalResponse,
)
from app.services import pro_billing_service, seat_service
from app.services.billing_service import is_configured
from app.services.pro_billing_service import ORG_TIERS
from app.services.sharing_service import require_active_share

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/professional", tags=["professional-billing"])


def _require_admin(current: dict) -> None:
    if current.get("org_role") not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Nur Praxis-Verwaltung (Inhaber:in/Admin).")


# ── Fall-Aktivierung (Sitz) ───────────────────────────────────────────────────

@router.post("/cases/{case_id}/activate")
async def activate(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        await require_active_share(current["user_id"], case_id, conn)
        await seat_service.activate_case(case_id, current, conn)
    return {"activated": True}


@router.delete("/cases/{case_id}/activate")
async def deactivate(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        await require_active_share(current["user_id"], case_id, conn)
        await seat_service.deactivate_case(case_id, current, conn)
    return {"activated": False}


# ── Abrechnung ────────────────────────────────────────────────────────────────

@router.get("/org/billing", response_model=OrgBillingStatus)
async def billing_status(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> OrgBillingStatus:
    async with pool.acquire() as conn:
        b = await seat_service.get_org_billing(current["org_id"], conn)
    return OrgBillingStatus(
        plan=b["plan"], status=b["status"], subscription_active=b["subscription_active"],
        active_cases=b["active_cases"], included=b["included"],
        role=current["org_role"], configured=is_configured(),
    )


@router.post("/org/billing/checkout", response_model=CheckoutResponse)
async def checkout(
    body: OrgCheckoutRequest,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> CheckoutResponse:
    _require_admin(current)
    if not is_configured():
        raise HTTPException(status_code=503, detail="Zahlungen sind derzeit nicht verfügbar.")
    if body.tier not in ORG_TIERS:
        raise HTTPException(status_code=422, detail="Unbekannter Tarif.")
    async with pool.acquire() as conn:
        b = await seat_service.get_org_billing(current["org_id"], conn)
    try:
        url = await pro_billing_service.create_org_checkout_session(
            org_id=current["org_id"], email=current.get("email"), tier=body.tier,
            stripe_customer_id=b["stripe_customer_id"],
        )
    except Exception:
        logger.exception("Org-Checkout fehlgeschlagen (tier=%s)", body.tier)
        raise HTTPException(status_code=502, detail="Checkout konnte nicht gestartet werden.")
    return CheckoutResponse(url=url)


@router.post("/org/billing/checkout/verify", response_model=CheckoutVerifyResponse)
async def verify(
    body: CheckoutVerifyRequest,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> CheckoutVerifyResponse:
    if not is_configured():
        raise HTTPException(status_code=503, detail="Zahlungen sind derzeit nicht verfügbar.")
    try:
        tier = await pro_billing_service.verify_and_fulfill_org_session(
            session_id=body.session_id, org_id=current["org_id"], pool=pool,
        )
    except Exception:
        logger.exception("Org-Checkout-Verifikation fehlgeschlagen (session=%s)", body.session_id)
        raise HTTPException(status_code=502, detail="Verifikation fehlgeschlagen.")
    return CheckoutVerifyResponse(activated=tier is not None, plan=tier)


@router.post("/org/billing/portal", response_model=PortalResponse)
async def portal(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> PortalResponse:
    _require_admin(current)
    if not is_configured():
        raise HTTPException(status_code=503, detail="Zahlungen sind derzeit nicht verfügbar.")
    async with pool.acquire() as conn:
        b = await seat_service.get_org_billing(current["org_id"], conn)
    if not b["stripe_customer_id"]:
        raise HTTPException(status_code=400, detail="Kein Zahlungskonto vorhanden.")
    try:
        url = await pro_billing_service.create_org_portal_session(
            stripe_customer_id=b["stripe_customer_id"])
    except Exception:
        logger.exception("Org-Portal fehlgeschlagen")
        raise HTTPException(status_code=502, detail="Portal konnte nicht geöffnet werden.")
    return PortalResponse(url=url)

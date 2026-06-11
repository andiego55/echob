"""Router: Subscription & Zahlungen — /api/v1/subscription"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.schemas.subscription import (
    CheckoutRequest,
    CheckoutResponse,
    CheckoutVerifyRequest,
    CheckoutVerifyResponse,
    PortalResponse,
    SubscriptionStatus,
)
from app.services import billing_service
from app.services.subscription_service import get_subscription_status

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/subscription", tags=["subscription"])


@router.get("/status", response_model=SubscriptionStatus)
async def subscription_status(
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> SubscriptionStatus:
    """Gibt den aktuellen Abo-Status des Nutzers zurück."""
    async with pool.acquire() as conn:
        data = await get_subscription_status(current_user["user_id"], conn)
    return SubscriptionStatus(**data)


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CheckoutResponse:
    """Erzeugt eine Stripe-Checkout-Session und gibt die Redirect-URL zurück."""
    if not billing_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Zahlungen sind derzeit nicht verfügbar. Bitte kontaktiere uns per E-Mail.",
        )

    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT stripe_customer_id FROM user_profiles WHERE user_id = $1", user_id
        )

    try:
        url = await billing_service.create_checkout_session(
            user_id=str(user_id),
            email=current_user.get("email"),
            product_key=body.product,
            stripe_customer_id=row["stripe_customer_id"] if row else None,
        )
    except Exception:
        logger.exception("Stripe-Checkout fehlgeschlagen (product=%s)", body.product)
        raise HTTPException(status_code=502, detail="Checkout konnte nicht gestartet werden.")

    return CheckoutResponse(url=url)


@router.post("/checkout/verify", response_model=CheckoutVerifyResponse)
async def verify_checkout(
    body: CheckoutVerifyRequest,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CheckoutVerifyResponse:
    """Sofort-Freischaltung nach dem Stripe-Redirect (unabhängig vom Webhook)."""
    if not billing_service.is_configured():
        raise HTTPException(status_code=503, detail="Zahlungen sind derzeit nicht verfügbar.")

    try:
        plan = await billing_service.verify_and_fulfill_session(
            session_id=body.session_id,
            user_id=str(current_user["user_id"]),
            pool=pool,
        )
    except Exception:
        logger.exception("Checkout-Verifikation fehlgeschlagen (session=%s)", body.session_id)
        raise HTTPException(status_code=502, detail="Verifikation fehlgeschlagen.")

    return CheckoutVerifyResponse(activated=plan is not None, plan=plan)


@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> PortalResponse:
    """Stripe Billing-Portal: Abo verwalten, kündigen, Rechnungen einsehen."""
    if not billing_service.is_configured():
        raise HTTPException(status_code=503, detail="Zahlungen sind derzeit nicht verfügbar.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT stripe_customer_id FROM user_profiles WHERE user_id = $1",
            current_user["user_id"],
        )
    customer_id = row["stripe_customer_id"] if row else None
    if not customer_id:
        raise HTTPException(status_code=400, detail="Kein Zahlungskonto vorhanden.")

    try:
        url = await billing_service.create_portal_session(stripe_customer_id=customer_id)
    except Exception:
        logger.exception("Stripe-Portal fehlgeschlagen")
        raise HTTPException(status_code=502, detail="Portal konnte nicht geöffnet werden.")

    return PortalResponse(url=url)


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, pool=Depends(get_pool)) -> dict:
    """Stripe-Webhook: schaltet Käufe frei und hält Abo-Laufzeiten aktuell.

    Kein Auth-Dependency — Authentizität wird über die Stripe-Signatur geprüft.
    """
    if not billing_service.is_configured():
        raise HTTPException(status_code=503, detail="Stripe nicht konfiguriert.")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = billing_service.construct_event(payload, sig_header)
    except Exception:
        logger.warning("Ungültige Webhook-Signatur oder Payload", exc_info=True)
        raise HTTPException(status_code=400, detail="Ungültige Signatur.")

    try:
        await billing_service.handle_event(event, pool)
    except Exception:
        # 500 → Stripe versucht es erneut (Retry-Mechanismus)
        logger.exception("Webhook-Verarbeitung fehlgeschlagen: %s", event.get("type"))
        raise HTTPException(status_code=500, detail="Verarbeitung fehlgeschlagen.")

    return {"received": True}

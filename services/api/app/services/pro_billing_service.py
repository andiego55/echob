"""Org-Billing: Stripe-Abos für Praxen (Solo/Praxis/Institut).

Spiegelt billing_service (B2C): Checkout/Portal + Webhook-Verarbeitung. Org-Events werden
über metadata.org_id erkannt (von billing_service.handle_event hierher delegiert). Reuse
desselben Stripe-Accounts; Inline-Preise (kein Dashboard-Setup nötig).

Kein Abo-Trial: Der kostenlose Test läuft über die Spielwiese (Beispielfall, alle
Werkzeuge, ohne Kreditkarte). Abos starten direkt zahlend; abgerechnet wird je
aktivem Fall.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from uuid import UUID

from app.core.config import settings
from app.services.billing_service import _plain

logger = logging.getLogger(__name__)

ORG_TIERS: dict[str, dict] = {
    "solo": {
        "name": "EchoB Praxis – Solo", "amount_cents": 5900, "included_cases": 1,
        "price_id_setting": "stripe_price_pro_solo",
    },
    "praxis": {
        "name": "EchoB Praxis", "amount_cents": 14900, "included_cases": 5,
        "price_id_setting": "stripe_price_pro_praxis",
    },
    "institut": {
        "name": "EchoB Institut", "amount_cents": 24900, "included_cases": 10,
        "price_id_setting": "stripe_price_pro_institut",
    },
}


def included_cases(plan: str | None) -> int:
    t = ORG_TIERS.get(plan or "")
    return t["included_cases"] if t else 0


def _stripe():
    import stripe
    stripe.api_key = settings.stripe_secret_key
    return stripe


def _line_item(tier: str) -> dict:
    t = ORG_TIERS[tier]
    price_id = getattr(settings, t["price_id_setting"], "")
    if price_id:
        return {"price": price_id, "quantity": 1}
    return {
        "price_data": {
            "currency": "eur",
            "unit_amount": t["amount_cents"],
            "recurring": {"interval": "month"},
            "product_data": {"name": t["name"]},
        },
        "quantity": 1,
    }


# ── Checkout & Portal ─────────────────────────────────────────────────────────

async def create_org_checkout_session(*, org_id, email, tier, stripe_customer_id) -> str:
    base = settings.frontend_url.rstrip("/")
    params: dict = {
        "mode": "subscription",
        "line_items": [_line_item(tier)],
        "success_url":
            f"{base}/professional/settings?billing=success&session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{base}/professional/settings?billing=cancelled",
        "metadata": {"org_id": str(org_id), "tier": tier},
        "subscription_data": {
            "metadata": {"org_id": str(org_id), "tier": tier},
        },
        "locale": "de",
        "allow_promotion_codes": True,
    }
    if stripe_customer_id:
        params["customer"] = stripe_customer_id
    elif email:
        params["customer_email"] = email
    stripe = _stripe()
    session = await asyncio.to_thread(stripe.checkout.Session.create, **params)
    return session.url


async def create_org_portal_session(*, stripe_customer_id) -> str:
    base = settings.frontend_url.rstrip("/")
    stripe = _stripe()
    session = await asyncio.to_thread(
        stripe.billing_portal.Session.create,
        customer=stripe_customer_id,
        return_url=f"{base}/professional/settings",
    )
    return session.url


# ── Freischaltung + Webhook ───────────────────────────────────────────────────

async def fulfill_org_checkout(obj, pool) -> str | None:
    """Schaltet ein Org-Abo nach Checkout frei (idempotent über UPDATE)."""
    meta = obj.get("metadata") or {}
    org_id_str = meta.get("org_id")
    tier = meta.get("tier")
    if not org_id_str or tier not in ORG_TIERS:
        return None

    org_id = UUID(org_id_str)
    customer_id = obj.get("customer")
    subscription_id = obj.get("subscription")
    status, ends_at, starts_at = "active", None, None
    if subscription_id:
        try:
            stripe = _stripe()
            sub = _plain(await asyncio.to_thread(stripe.Subscription.retrieve, subscription_id))
            status = sub.get("status") or "active"
            pe = sub.get("current_period_end")
            if pe:
                ends_at = datetime.fromtimestamp(pe, tz=UTC)
            ps = sub.get("current_period_start")
            if ps:
                starts_at = datetime.fromtimestamp(ps, tz=UTC)
        except Exception:
            logger.exception("Org-Subscription %s nicht ladbar", subscription_id)

    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE organizations SET plan = $2, subscription_status = $3, "
            "subscription_ends_at = $4, current_period_start = COALESCE($7, current_period_start), "
            "stripe_customer_id = COALESCE($5, stripe_customer_id), "
            "stripe_subscription_id = COALESCE($6, stripe_subscription_id), updated_at = NOW() "
            "WHERE id = $1",
            org_id, tier, status, ends_at, customer_id, subscription_id, starts_at,
        )
    logger.info("Org-Abo aktiviert: org=%s tier=%s status=%s", org_id, tier, status)
    return tier


async def verify_and_fulfill_org_session(*, session_id, org_id, pool) -> str | None:
    """Sofort-Freischaltung nach dem Stripe-Redirect (unabhängig vom Webhook)."""
    stripe = _stripe()
    obj = _plain(await asyncio.to_thread(stripe.checkout.Session.retrieve, session_id))
    if (obj.get("metadata") or {}).get("org_id") != str(org_id):
        return None
    if obj.get("payment_status") not in ("paid", "no_payment_required"):
        # Defensiv (z. B. 100%-Promo): Session 'complete' ohne direkte Zahlung zählt auch.
        if obj.get("status") != "complete":
            return None
    return await fulfill_org_checkout(obj, pool)


async def handle_org_subscription_event(event, pool) -> None:
    """Org-Events (metadata.org_id) — von billing_service.handle_event delegiert."""
    etype = event["type"]
    obj = _plain(event["data"]["object"])

    if etype == "checkout.session.completed":
        await fulfill_org_checkout(obj, pool)
    elif etype == "customer.subscription.updated":
        pe = obj.get("current_period_end")
        ends_at = datetime.fromtimestamp(pe, tz=UTC) if pe else None
        ps = obj.get("current_period_start")
        starts_at = datetime.fromtimestamp(ps, tz=UTC) if ps else None
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE organizations SET subscription_status = $2, "
                "subscription_ends_at = COALESCE($3, subscription_ends_at), "
                "current_period_start = COALESCE($4, current_period_start), updated_at = NOW() "
                "WHERE stripe_subscription_id = $1",
                obj.get("id"), obj.get("status") or "active", ends_at, starts_at,
            )
    elif etype == "customer.subscription.deleted":
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE organizations SET subscription_status = 'canceled', "
                "subscription_ends_at = NOW(), updated_at = NOW() "
                "WHERE stripe_subscription_id = $1",
                obj.get("id"),
            )
    else:
        logger.debug("Org-Event ignoriert: %s", etype)

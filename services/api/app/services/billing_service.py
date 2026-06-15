"""Billing-Service: Stripe Checkout, Billing-Portal und Webhook-Verarbeitung.

Konfiguration über Env-Vars (siehe core/config.py):
- STRIPE_SECRET_KEY       (erforderlich für Zahlungen)
- STRIPE_WEBHOOK_SECRET   (erforderlich für Webhook-Verifikation in Production)
- STRIPE_PRICE_*          (optional – ohne sie werden Preise inline erzeugt)
- FRONTEND_URL            (für Redirects nach dem Checkout)

Preise sind hier als Single Source of Truth definiert und müssen mit der
UpgradePage im Frontend übereinstimmen.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.core.config import settings

logger = logging.getLogger(__name__)

STARTPAKET_ACCESS_DAYS = 31

# ── Produktkatalog ────────────────────────────────────────────────────────────

PRODUCTS: dict[str, dict] = {
    "startpaket": {
        "name": "EchoB Startpaket",
        "description": "1 Monat App-Vollzugang + 1 persönliche Coaching-Stunde (60 min)",
        "amount_cents": 9900,
        "mode": "payment",          # Einmalzahlung
        "interval": None,
        "price_id_setting": "stripe_price_startpaket",
    },
    "early_bird": {
        "name": "EchoB Early Bird Abo",
        "description": "Vollzugang zu allen Features – monatlich kündbar",
        "amount_cents": 1299,
        "mode": "subscription",
        "interval": "month",
        "price_id_setting": "stripe_price_early_bird",
    },
    "regular": {
        "name": "EchoB Monatsabo",
        "description": "Vollzugang ohne Laufzeitbindung – monatlich kündbar",
        "amount_cents": 2499,
        "mode": "subscription",
        "interval": "month",
        "price_id_setting": "stripe_price_regular",
    },
    "annual": {
        "name": "EchoB Jahresabo",
        "description": "Ein Jahr Vollzugang zum Vorzugspreis",
        "amount_cents": 19900,
        "mode": "subscription",
        "interval": "year",
        "price_id_setting": "stripe_price_annual",
    },
}


def is_configured() -> bool:
    return bool(settings.stripe_secret_key)


def _stripe():
    import stripe
    stripe.api_key = settings.stripe_secret_key
    return stripe


def _line_item(product_key: str) -> dict:
    """Price-ID aus Env wenn gesetzt, sonst Inline-Preis (kein Dashboard-Setup nötig)."""
    product = PRODUCTS[product_key]
    price_id = getattr(settings, product["price_id_setting"], "")
    if price_id:
        return {"price": price_id, "quantity": 1}

    price_data: dict = {
        "currency": "eur",
        "unit_amount": product["amount_cents"],
        "product_data": {
            "name": product["name"],
            "description": product["description"],
        },
    }
    if product["interval"]:
        price_data["recurring"] = {"interval": product["interval"]}
    return {"price_data": price_data, "quantity": 1}


# ── Checkout & Portal ─────────────────────────────────────────────────────────

async def create_checkout_session(
    *, user_id: str, email: str | None, product_key: str,
    stripe_customer_id: str | None,
) -> str:
    """Erzeugt eine Stripe-Checkout-Session und gibt die Redirect-URL zurück."""
    product = PRODUCTS[product_key]
    base = settings.frontend_url.rstrip("/")

    params: dict = {
        "mode": product["mode"],
        "line_items": [_line_item(product_key)],
        # {CHECKOUT_SESSION_ID} wird von Stripe ersetzt → Sofort-Verifikation
        # beim Rückkehren, unabhängig vom Webhook
        "success_url": f"{base}/app/upgrade?status=success&product={product_key}&session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{base}/app/upgrade?status=cancelled",
        "metadata": {"user_id": user_id, "product": product_key},
        "locale": "de",
        "allow_promotion_codes": True,
    }
    # Metadaten auch an der Subscription selbst, damit subscription-Events
    # ohne Session-Lookup zugeordnet werden können
    if product["mode"] == "subscription":
        params["subscription_data"] = {
            "metadata": {"user_id": user_id, "product": product_key},
        }

    if stripe_customer_id:
        params["customer"] = stripe_customer_id
    elif email:
        params["customer_email"] = email

    stripe = _stripe()
    session = await asyncio.to_thread(stripe.checkout.Session.create, **params)
    return session.url


async def create_portal_session(*, stripe_customer_id: str) -> str:
    """Billing-Portal (Abo verwalten / kündigen / Rechnungen)."""
    base = settings.frontend_url.rstrip("/")
    stripe = _stripe()
    session = await asyncio.to_thread(
        stripe.billing_portal.Session.create,
        customer=stripe_customer_id,
        return_url=f"{base}/app/upgrade",
    )
    return session.url


# ── Webhook-Verarbeitung ──────────────────────────────────────────────────────

def construct_event(payload: bytes, sig_header: str | None):
    """Verifiziert die Webhook-Signatur. In Development ohne Secret: unverifiziert."""
    import stripe

    if settings.stripe_webhook_secret:
        return stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    if settings.is_development:
        logger.warning("STRIPE_WEBHOOK_SECRET nicht gesetzt – Webhook UNVERIFIZIERT (nur Development).")
        import json
        return stripe.Event.construct_from(json.loads(payload), settings.stripe_secret_key)
    raise ValueError("STRIPE_WEBHOOK_SECRET ist in Production erforderlich.")


async def _upsert_profile_plan(
    conn, *, user_id: UUID, plan: str,
    ends_at: datetime | None,
    customer_id: str | None,
    subscription_id: str | None,
) -> None:
    await conn.execute(
        """
        INSERT INTO user_profiles (user_id, plan, subscription_ends_at, stripe_customer_id, stripe_subscription_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
            plan = EXCLUDED.plan,
            subscription_ends_at = EXCLUDED.subscription_ends_at,
            stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, user_profiles.stripe_customer_id),
            stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, user_profiles.stripe_subscription_id),
            updated_at = NOW()
        """,
        user_id, plan, ends_at, customer_id, subscription_id,
    )


async def fulfill_checkout_session(obj, pool) -> str | None:
    """Schaltet einen bezahlten Checkout frei (idempotent).

    Wird sowohl vom Webhook als auch von der Sofort-Verifikation nach dem
    Redirect aufgerufen. Gibt den freigeschalteten Plan zurück (oder None).
    """
    meta = obj.get("metadata") or {}
    user_id_str = meta.get("user_id")
    product_key = meta.get("product")
    if not user_id_str or product_key not in PRODUCTS:
        logger.warning("Checkout-Session ohne verwertbare Metadaten: %s", meta)
        return None

    user_id = UUID(user_id_str)
    customer_id = obj.get("customer")
    subscription_id = obj.get("subscription")
    now = datetime.now(UTC)

    if PRODUCTS[product_key]["mode"] == "payment":
        # Startpaket: fester Zugangs-Zeitraum
        ends_at = now + timedelta(days=STARTPAKET_ACCESS_DAYS)
    else:
        # Abo: Periodenende von Stripe holen (Renewals via subscription.updated)
        ends_at = None
        if subscription_id:
            try:
                stripe = _stripe()
                sub = await asyncio.to_thread(
                    stripe.Subscription.retrieve, subscription_id
                )
                period_end = sub.get("current_period_end")
                if period_end:
                    ends_at = datetime.fromtimestamp(period_end, tz=UTC)
            except Exception:
                logger.exception("Konnte Subscription %s nicht laden", subscription_id)

    async with pool.acquire() as conn:
        await _upsert_profile_plan(
            conn, user_id=user_id, plan=product_key, ends_at=ends_at,
            customer_id=customer_id, subscription_id=subscription_id,
        )
        await conn.execute(
            """
            INSERT INTO payments (user_id, product, stripe_session_id, stripe_customer_id, amount_cents, currency, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (stripe_session_id) DO NOTHING
            """,
            user_id, product_key, obj.get("id"), customer_id,
            obj.get("amount_total"), obj.get("currency"), obj.get("payment_status"),
        )
    logger.info("Zahlung verarbeitet: user=%s product=%s", user_id, product_key)
    return product_key


async def verify_and_fulfill_session(
    *, session_id: str, user_id: str, pool,
) -> str | None:
    """Sofort-Freischaltung nach Checkout-Redirect: Session bei Stripe prüfen.

    Verifiziert serverseitig, dass die Session bezahlt ist und zum eingeloggten
    Nutzer gehört. Gibt den Plan zurück, wenn freigeschaltet wurde.
    """
    stripe = _stripe()
    obj = await asyncio.to_thread(stripe.checkout.Session.retrieve, session_id)

    meta = obj.get("metadata") or {}
    if meta.get("user_id") != user_id:
        logger.warning("Checkout-Verifikation: Session %s gehört nicht zu User %s", session_id, user_id)
        return None
    if obj.get("payment_status") not in ("paid", "no_payment_required"):
        return None

    return await fulfill_checkout_session(obj, pool)


async def handle_event(event, pool) -> None:
    """Verarbeitet relevante Stripe-Events und aktualisiert die DB."""
    etype = event["type"]
    obj = event["data"]["object"]

    if etype == "checkout.session.completed":
        await fulfill_checkout_session(obj, pool)

    elif etype == "customer.subscription.updated":
        subscription_id = obj.get("id")
        period_end = obj.get("current_period_end")
        if not subscription_id or not period_end:
            return
        ends_at = datetime.fromtimestamp(period_end, tz=UTC)
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE user_profiles SET subscription_ends_at = $1, updated_at = NOW() "
                "WHERE stripe_subscription_id = $2",
                ends_at, subscription_id,
            )
        logger.info("Abo verlängert: %s bis %s", subscription_id, ends_at)

    elif etype == "customer.subscription.deleted":
        subscription_id = obj.get("id")
        if not subscription_id:
            return
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE user_profiles SET subscription_ends_at = NOW(), updated_at = NOW() "
                "WHERE stripe_subscription_id = $1",
                subscription_id,
            )
        logger.info("Abo beendet: %s", subscription_id)

    else:
        logger.debug("Ignoriertes Stripe-Event: %s", etype)

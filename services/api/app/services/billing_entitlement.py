"""Berechtigung: die eine Stelle, an der ein Zugang vergeben oder entzogen wird.

**Warum es dieses Modul gibt.** Der Zugang zur App hängt allein an
``user_profiles.plan`` + ``subscription_ends_at`` (siehe ``subscription_service``). Wer
dort hineinschreibt, ist der App egal — Stripe, Google Play, eine Rechnung oder eine
Überweisung. Damit das so bleibt, geht jede Vergabe durch ``grant_plan``; die
Anbieter-Anbindungen kennen nur noch diese Funktion.

**Die Anbieter stehen als Registry im Code**, nicht als CHECK in der Datenbank. Ein neuer
Zahlungsweg ist damit ein Eintrag hier und keine Migration — und wir laufen nicht in
dasselbe Problem wie seinerzeit bei ``echo_messages.thread_type``.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from app.core.logging import get_logger

logger = get_logger(__name__)

# Zahlungswege. Der Schlüssel landet in user_profiles.billing_source / payments.provider.
#   self_service = die Person schließt selbst ab · managed = wir schalten frei
PROVIDERS: dict[str, dict[str, Any]] = {
    "stripe": {
        "label": "Stripe (Web)",
        "self_service": True,
        "manageable_by_user": True,   # Kündigung über das Stripe-Kundenportal
    },
    "google_play": {
        "label": "Google Play",
        "self_service": True,
        # Abos aus dem Store verwaltet der Store — wir dürfen dort nicht kündigen.
        "manageable_by_user": False,
    },
    "apple": {
        "label": "App Store",
        "self_service": True,
        "manageable_by_user": False,
    },
    "invoice": {
        "label": "Rechnung / Überweisung",
        "self_service": False,
        "manageable_by_user": False,
    },
    "partner": {
        "label": "Über Partner oder Institut",
        "self_service": False,
        "manageable_by_user": False,
    },
    "manual": {
        "label": "Manuell freigeschaltet",
        "self_service": False,
        "manageable_by_user": False,
    },
}

# Pläne, die einen bezahlten Zugang bedeuten (trial ist keiner).
PAID_PLANS = ("early_bird", "regular", "annual")


def provider_label(source: str | None) -> str:
    if not source:
        return "—"
    return PROVIDERS.get(source, {}).get("label", source)


async def grant_plan(
    conn,
    *,
    user_id: UUID | str,
    plan: str,
    source: str,
    ends_at: datetime | None = None,
    external_id: str | None = None,
    note: str | None = None,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
) -> None:
    """Vergibt einen Zugang — unabhängig davon, woher die Zahlung kam.

    ``ends_at=None`` heißt „läuft bis auf Weiteres". Die Stripe-Felder bleiben optional
    erhalten, damit das Kundenportal weiter funktioniert; für andere Wege bleiben sie leer.
    """
    if source not in PROVIDERS:
        logger.warning("Unbekannter Zahlungsweg '%s' — wird trotzdem gespeichert.", source)

    await conn.execute(
        """
        INSERT INTO user_profiles
            (user_id, plan, subscription_ends_at, billing_source, billing_external_id,
             billing_note, stripe_customer_id, stripe_subscription_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
            plan                   = EXCLUDED.plan,
            subscription_ends_at   = EXCLUDED.subscription_ends_at,
            billing_source         = EXCLUDED.billing_source,
            billing_external_id    = COALESCE(EXCLUDED.billing_external_id,
                                              user_profiles.billing_external_id),
            billing_note           = COALESCE(EXCLUDED.billing_note, user_profiles.billing_note),
            stripe_customer_id     = COALESCE(EXCLUDED.stripe_customer_id,
                                              user_profiles.stripe_customer_id),
            stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id,
                                              user_profiles.stripe_subscription_id),
            updated_at             = NOW()
        """,
        UUID(str(user_id)), plan, ends_at, source, external_id, note,
        stripe_customer_id, stripe_subscription_id,
    )
    logger.info("Zugang vergeben: user=%s plan=%s quelle=%s", str(user_id)[:8], plan, source)


async def revoke_plan(conn, user_id: UUID | str, *, note: str | None = None) -> None:
    """Setzt auf ``trial`` zurück — etwa nach Rückerstattung oder Widerruf."""
    await conn.execute(
        "UPDATE user_profiles SET plan = 'trial', subscription_ends_at = NULL, "
        "billing_note = COALESCE($2, billing_note), updated_at = NOW() WHERE user_id = $1",
        UUID(str(user_id)), note,
    )
    logger.info("Zugang entzogen: user=%s", str(user_id)[:8])


async def active_subscription(conn, user_id: UUID | str) -> dict[str, Any] | None:
    """Laufender bezahlter Zugang samt Quelle — oder None."""
    row = await conn.fetchrow(
        "SELECT plan, subscription_ends_at, billing_source, billing_external_id "
        "FROM user_profiles WHERE user_id = $1",
        UUID(str(user_id)),
    )
    if not row or row["plan"] not in PAID_PLANS:
        return None
    ends = row["subscription_ends_at"]
    if ends is not None:
        if ends.tzinfo is None:
            ends = ends.replace(tzinfo=UTC)
        if ends <= datetime.now(UTC):
            return None
    return dict(row)


async def blocking_subscription(conn, user_id: UUID | str, source: str) -> dict[str, Any] | None:
    """Steht einem neuen Abschluss bei ``source`` ein bestehendes Abo im Weg?

    Zweck ist nicht Bürokratie, sondern Geld: Wer im Web und noch einmal im App-Store
    abschließt, zahlt zweimal und kann eines davon bei uns nicht kündigen. Ein Abo bei
    DERSELBEN Quelle blockiert nicht — das ist ein Wechsel des Tarifs.
    """
    aktiv = await active_subscription(conn, user_id)
    if not aktiv or aktiv["billing_source"] == source:
        return None
    return aktiv


async def record_payment(
    conn,
    *,
    user_id: UUID | str,
    product: str,
    provider: str,
    external_id: str | None = None,
    amount_cents: int | None = None,
    currency: str | None = None,
    status: str | None = None,
    stripe_customer_id: str | None = None,
) -> None:
    """Protokolliert eine Zahlung. Dieselbe Kennung je Anbieter zählt genau einmal."""
    await conn.execute(
        """
        INSERT INTO payments
            (user_id, product, provider, external_id, stripe_session_id,
             stripe_customer_id, amount_cents, currency, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (provider, external_id) WHERE external_id IS NOT NULL DO NOTHING
        """,
        UUID(str(user_id)), product, provider, external_id,
        external_id if provider == "stripe" else None,
        stripe_customer_id, amount_cents, currency, status,
    )

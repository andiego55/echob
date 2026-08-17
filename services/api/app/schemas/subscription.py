"""Pydantic-Schemas für Subscription & Zahlungen."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

PlanType = Literal["trial", "early_bird", "regular", "annual"]

# Produkte, die gekauft werden können (alles außer trial).
ProductType = Literal["early_bird", "regular", "annual"]


class SubscriptionStatus(BaseModel):
    plan: PlanType
    is_trial_active: bool
    trial_days_left: int
    trial_ends_at: str | None
    subscription_ends_at: str | None
    # True solange Zugriff besteht (Trial aktiv ODER bezahlter Plan nicht abgelaufen)
    is_active: bool = True
    # Woher der Zugang stammt: stripe, google_play, invoice, manual … (Registry im Code)
    billing_source: str | None = None
    billing_label: str | None = None
    # Kann die Person das Abo bei uns verwalten? Bei App-Store-Abos nicht — die
    # laufen dort und dürfen von uns aus auch nicht gekündigt werden.
    manageable_by_user: bool = False


class AiUsageQuota(BaseModel):
    kind: str
    label: str
    used: int
    limit: int | None       # None = unbegrenzt/deaktiviert
    remaining: int | None
    unlimited: bool


class AiUsageStatus(BaseModel):
    period_resets_at: str    # ISO-Zeitpunkt, an dem sich das Kontingent zurücksetzt
    quotas: list[AiUsageQuota]


class CheckoutRequest(BaseModel):
    product: ProductType


class CheckoutResponse(BaseModel):
    url: str


class CheckoutVerifyRequest(BaseModel):
    session_id: str


class CheckoutVerifyResponse(BaseModel):
    activated: bool
    plan: str | None = None


class PortalResponse(BaseModel):
    url: str

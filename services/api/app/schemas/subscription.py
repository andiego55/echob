"""Pydantic-Schemas für Subscription & Zahlungen."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

PlanType = Literal["trial", "startpaket", "early_bird", "regular", "annual"]

# Produkte, die gekauft werden können (alles außer trial)
ProductType = Literal["startpaket", "early_bird", "regular", "annual"]


class SubscriptionStatus(BaseModel):
    plan: PlanType
    is_trial_active: bool
    trial_days_left: int
    trial_ends_at: str | None
    subscription_ends_at: str | None
    # True solange Zugriff besteht (Trial aktiv ODER bezahlter Plan nicht abgelaufen)
    is_active: bool = True


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

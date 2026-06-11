"""Pydantic-Schemas für Subscription."""
from __future__ import annotations

from typing import Literal
from pydantic import BaseModel


PlanType = Literal["trial", "early_bird", "regular", "annual"]


class SubscriptionStatus(BaseModel):
    plan: PlanType
    is_trial_active: bool
    trial_days_left: int
    trial_ends_at: str | None
    subscription_ends_at: str | None

"""Router: Subscription-Status — /api/v1/subscription"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user, get_pool
from app.schemas.subscription import SubscriptionStatus
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

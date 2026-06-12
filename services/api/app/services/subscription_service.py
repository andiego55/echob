"""Subscription-Service: Trial-Limits und Plan-Status."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import HTTPException, status

from app.core.config import settings

TRIAL_DAYS = 3
TRIAL_MAX_SCENES = 5
TRIAL_MAX_CASES = 1


async def enforce_echo_prompt_limit(user_id: str, conn) -> None:
    """Kostenschutz in der Entwicklungsphase: begrenzt Echo-Prompts pro Nutzer.

    Zählt alle Nutzer-Nachrichten über sämtliche Echo-Chats (Fall-Echo,
    Themendialoge, Szenen-Erfassung, Profil-Dialoge). 0 = deaktiviert.
    """
    limit = settings.echo_prompt_limit
    if limit <= 0:
        return
    count = await conn.fetchval(
        "SELECT COUNT(*) FROM echo_messages WHERE user_id = $1 AND role = 'user'",
        user_id,
    )
    if count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ECHO_LIMIT_REACHED",
        )


async def get_subscription_status(user_id: str, conn) -> dict:
    row = await conn.fetchrow(
        "SELECT plan, trial_started_at, subscription_ends_at FROM user_profiles WHERE user_id = $1",
        user_id,
    )
    now = datetime.now(timezone.utc)

    if not row:
        return {
            "plan": "trial",
            "is_trial_active": True,
            "trial_days_left": TRIAL_DAYS,
            "trial_ends_at": (now + timedelta(days=TRIAL_DAYS)).isoformat(),
            "subscription_ends_at": None,
            "is_active": True,
        }

    plan = row["plan"]
    is_trial_active = False
    trial_days_left = 0
    trial_ends_at = None

    if plan == "trial":
        started = row["trial_started_at"]
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        trial_ends_at = started + timedelta(days=TRIAL_DAYS)
        delta = trial_ends_at - now
        is_trial_active = delta.total_seconds() > 0
        trial_days_left = max(0, delta.days)

    sub_ends = row["subscription_ends_at"]
    if sub_ends is not None and sub_ends.tzinfo is None:
        sub_ends = sub_ends.replace(tzinfo=timezone.utc)

    # Bezahlter Plan ist aktiv, solange kein Ablaufdatum gesetzt oder es in der
    # Zukunft liegt (Stripe-Webhooks verlängern subscription_ends_at bei Renewal).
    is_paid_active = plan != "trial" and (sub_ends is None or sub_ends > now)
    is_active = is_trial_active or is_paid_active

    return {
        "plan": plan,
        "is_trial_active": is_trial_active,
        "trial_days_left": trial_days_left,
        "trial_ends_at": trial_ends_at.isoformat() if trial_ends_at else None,
        "subscription_ends_at": sub_ends.isoformat() if sub_ends else None,
        "is_active": is_active,
    }


async def enforce_trial_limits(
    user_id: str,
    conn,
    *,
    check_case: bool = False,
    check_scene: bool = False,
) -> None:
    sub = await get_subscription_status(user_id, conn)
    plan = sub["plan"]

    # Bezahlter Plan abgelaufen → wie abgelaufener Trial behandeln
    if plan != "trial" and not sub["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="TRIAL_EXPIRED",
        )

    if plan == "trial":
        if not sub["is_trial_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="TRIAL_EXPIRED",
            )
        if check_case:
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM cases WHERE user_id = $1 AND archived_at IS NULL",
                user_id,
            )
            if count >= TRIAL_MAX_CASES:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="TRIAL_CASE_LIMIT",
                )
        if check_scene:
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM scenes WHERE user_id = $1",
                user_id,
            )
            if count >= TRIAL_MAX_SCENES:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="TRIAL_SCENE_LIMIT",
                )

"""Subscription-Service: Trial-Limits und Plan-Status."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status

from app.core.config import settings

TRIAL_DAYS = 3
TRIAL_MAX_SCENES = 5
TRIAL_MAX_CASES = 1


async def enforce_echo_prompt_limit(user_id: str, conn) -> None:
    """Kostenschutz: begrenzt Echo-Prompts pro Nutzer — Gesamt- und Tagesdeckel.

    Zählt alle Nutzer-Nachrichten über sämtliche Echo-Chats (Fall-Echo,
    Themendialoge, Szenen-Erfassung, Profil-Dialoge). Beide Grenzen: 0 = aus.
    """
    total_limit = settings.echo_prompt_limit
    if total_limit > 0:
        total = await conn.fetchval(
            "SELECT COUNT(*) FROM echo_messages WHERE user_id = $1 AND role = 'user'",
            user_id,
        )
        if total >= total_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ECHO_LIMIT_REACHED",
            )
    daily_limit = settings.echo_prompt_daily_limit
    if daily_limit > 0:
        today = await conn.fetchval(
            "SELECT COUNT(*) FROM echo_messages "
            "WHERE user_id = $1 AND role = 'user' AND created_at >= $2",
            user_id, _start_of_day(datetime.now(UTC)),
        )
        if today >= daily_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ECHO_LIMIT_REACHED",
            )


async def enforce_professional_echo_limit(professional_user_id: str, conn) -> None:
    """Kostenschutz: begrenzt Echo-Nachrichten pro Fachperson — Gesamt- und Tagesdeckel.

    Gleiche Obergrenzen wie für Nutzer (settings.echo_prompt_limit /
    echo_prompt_daily_limit). 0 = jeweils deaktiviert.
    """
    total_limit = settings.echo_prompt_limit
    if total_limit > 0:
        total = await conn.fetchval(
            "SELECT COUNT(*) FROM professional_echo_messages "
            "WHERE professional_user_id = $1 AND role = 'user'",
            professional_user_id,
        )
        if total >= total_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ECHO_LIMIT_REACHED",
            )
    daily_limit = settings.echo_prompt_daily_limit
    if daily_limit > 0:
        today = await conn.fetchval(
            "SELECT COUNT(*) FROM professional_echo_messages "
            "WHERE professional_user_id = $1 AND role = 'user' AND created_at >= $2",
            professional_user_id, _start_of_day(datetime.now(UTC)),
        )
        if today >= daily_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ECHO_LIMIT_REACHED",
            )


_DEMO_LIMIT_MSG = (
    "Die Spielwiese ist zum Ausprobieren gedacht und hier bewusst begrenzt. "
    "Für unbegrenztes Arbeiten lege einen echten Fall an."
)


async def enforce_demo_echo_limit(professional_user_id: str, case_id, conn) -> None:
    """Harter Deckel der kostenlosen Spielwiese: begrenzt Echo-Nachrichten auf Demo-Fällen."""
    from app.services.demo_service import (
        DEMO_CASE_ID,
        DEMO_PARTNER_CASE_ID,
        is_demo_case,
    )
    if not is_demo_case(case_id):
        return
    limit = settings.demo_echo_limit
    if limit <= 0:
        return
    count = await conn.fetchval(
        "SELECT COUNT(*) FROM professional_echo_messages "
        "WHERE professional_user_id = $1 AND role = 'user' AND case_id IN ($2, $3)",
        professional_user_id, DEMO_CASE_ID, DEMO_PARTNER_CASE_ID,
    )
    if count >= limit:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_DEMO_LIMIT_MSG)


# Kind → (Settings-Feld, Fehlercode, Anzeigename). Monatliches Kontingent,
# gezählt im löschfesten ai_usage_log: setzt sich am Monatsersten zurück und
# lässt sich nicht durch Löschen von Berichten/Skalen umgehen.
_AI_USAGE_LIMITS = {
    "report":     ("report_limit", "REPORT_LIMIT_REACHED", "Berichte"),
    "scale_calc": ("scale_calc_limit", "SCALE_LIMIT_REACHED", "Skalen-Analysen"),
}


def _start_of_day(now: datetime) -> datetime:
    """Beginn des laufenden Tages, 00:00 UTC (Reset des Tages-Deckels)."""
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _month_start(now: datetime) -> datetime:
    """Beginn des laufenden Kalendermonats, 00:00 UTC."""
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _next_month_start(now: datetime) -> datetime:
    """Beginn des Folgemonats, 00:00 UTC — Zeitpunkt des Kontingent-Resets."""
    if now.month == 12:
        return now.replace(year=now.year + 1, month=1, day=1,
                           hour=0, minute=0, second=0, microsecond=0)
    return now.replace(month=now.month + 1, day=1,
                       hour=0, minute=0, second=0, microsecond=0)


async def _count_ai_usage_this_month(user_id: str, conn, kind: str) -> int:
    """Zählt KI-Aktionen seit Beginn des laufenden Kalendermonats (UTC).

    Enforcement und Status-Anzeige teilen sich diese Grenze, damit Counter
    und Sperre garantiert übereinstimmen.
    """
    month_start = _month_start(datetime.now(UTC))
    count = await conn.fetchval(
        "SELECT COUNT(*) FROM ai_usage_log "
        "WHERE user_id = $1 AND kind = $2 AND created_at >= $3",
        user_id, kind, month_start,
    )
    return count or 0


async def enforce_ai_usage_limit(user_id: str, conn, kind: str) -> None:
    """Kostenschutz für kostenintensive KI-Aktionen (Berichte, Skalen).

    Monatliches Kontingent pro Nutzer. 0 = deaktiviert.
    """
    setting_name, error_code, _label = _AI_USAGE_LIMITS[kind]
    limit = getattr(settings, setting_name)
    if limit <= 0:
        return
    count = await _count_ai_usage_this_month(user_id, conn, kind)
    if count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_code,
        )


async def log_ai_usage(user_id: str, conn, kind: str) -> None:
    """Verbucht eine erfolgreich ausgeführte KI-Aktion."""
    await conn.execute(
        "INSERT INTO ai_usage_log (user_id, kind) VALUES ($1, $2)",
        user_id, kind,
    )


async def get_ai_usage_status(user_id: str, conn) -> dict:
    """Kontingent-Übersicht des laufenden Monats (Counter + Einstellungen)."""
    quotas = []
    for kind, (setting_name, _code, label) in _AI_USAGE_LIMITS.items():
        limit = getattr(settings, setting_name)
        used = await _count_ai_usage_this_month(user_id, conn, kind)
        unlimited = limit <= 0
        quotas.append({
            "kind": kind,
            "label": label,
            "used": used,
            "limit": None if unlimited else limit,
            "remaining": None if unlimited else max(0, limit - used),
            "unlimited": unlimited,
        })
    return {
        "period_resets_at": _next_month_start(datetime.now(UTC)).isoformat(),
        "quotas": quotas,
    }


async def get_subscription_status(user_id: str, conn) -> dict:
    row = await conn.fetchrow(
        "SELECT plan, trial_started_at, subscription_ends_at FROM user_profiles WHERE user_id = $1",
        user_id,
    )
    now = datetime.now(UTC)

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
            started = started.replace(tzinfo=UTC)
        trial_ends_at = started + timedelta(days=TRIAL_DAYS)
        delta = trial_ends_at - now
        is_trial_active = delta.total_seconds() > 0
        trial_days_left = max(0, delta.days)

    sub_ends = row["subscription_ends_at"]
    if sub_ends is not None and sub_ends.tzinfo is None:
        sub_ends = sub_ends.replace(tzinfo=UTC)

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

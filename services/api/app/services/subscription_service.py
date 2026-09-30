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
    "fall_faq":   ("fall_faq_limit", "FAQ_LIMIT_REACHED", "Fall-FAQ"),
    "satz_vorschlag": ("satz_vorschlag_limit", "SATZ_VORSCHLAG_LIMIT_REACHED",
                       "Satz-Vorschläge"),
    "selbstportrait": ("selbstportrait_limit", "PORTRAIT_LIMIT_REACHED",
                       "Selbstporträts"),
    # **Gezählt in Minuten, nicht in Folgen.** Eine Folge zu zählen belohnt die lange und
    # bestraft die kurze — und wer drei kurze machen wollte, macht dann drei lange, weil
    # sie gleich viel kosten. Die Sprachausgabe kostet je Minute; das Kontingent auch.
    "podcast":    ("podcast_minuten_limit", "PODCAST_LIMIT_REACHED",
                   "Podcast-Minuten"),
}

#: Welche Arten in etwas anderem als Stück zählen — nur für die Anzeige.
_EINHEIT = {"podcast": "Minuten"}


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
    # **SUM(menge), nicht COUNT(*).** Alles, was in Stück zählt, trägt die Menge 1 — dort
    # ergibt die Summe dieselbe Zahl wie die Zählung vorher. Podcasts tragen ihre Minuten.
    # Ein COUNT hier hiesse: eine Folge ist eine Folge, ob fünf Minuten oder zwanzig.
    count = await conn.fetchval(
        "SELECT COALESCE(SUM(menge), 0) FROM ai_usage_log "
        "WHERE user_id = $1 AND kind = $2 AND created_at >= $3",
        user_id, kind, month_start,
    )
    return int(count or 0)


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


async def enforce_ai_usage_menge(user_id: str, conn, kind: str, menge: int) -> None:
    """Wie ``enforce_ai_usage_limit``, aber für eine bekannte Menge — und der Unterschied
    ist keine Feinheit.

    ``enforce_ai_usage_limit`` fragt „hast du noch etwas übrig?". Bei allem, was in Stück
    zählt, ist das genau richtig: Ein Bericht ist ein Bericht. Bei Podcast-Minuten nicht.
    Wer 28 von 30 Minuten verbraucht hat, kommt dort durch — und verbucht dann zwanzig. Das
    Kontingent stünde am Ende auf 48 von 30, und niemand hätte etwas falsch gemacht.

    Diese Fassung fragt stattdessen: **reicht es für DAS hier?** Und sie sagt in der
    Fehlermeldung, wie viel übrig ist, weil „Kontingent aufgebraucht" bei 12 freien Minuten
    einfach nicht stimmt.
    """
    setting_name, error_code, label = _AI_USAGE_LIMITS[kind]
    limit = getattr(settings, setting_name)
    if limit <= 0:
        return
    verbraucht = await _count_ai_usage_this_month(user_id, conn, kind)
    frei = max(0, limit - verbraucht)
    if menge > frei:
        einheit = _EINHEIT.get(kind, "")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            # Der Code bleibt derselbe, damit die Oberfläche ihn kennt; der Klartext
            # dahinter sagt, woran es liegt.
            detail=(
                f"{error_code}: Dafür bräuchte es {menge} {einheit}, frei sind noch "
                f"{frei} von {limit}. ({label})"
            ).strip(),
        )


async def has_ai_usage_left(user_id: str, conn, kind: str) -> bool:
    """Wie ``enforce_ai_usage_limit``, aber ohne 403 — für Aktionen, die *nebenbei* laufen.

    Der Unterschied ist nicht kosmetisch. Ein Bericht ist das, was die Person angefordert
    hat: Ist das Kontingent leer, gehört ein Fehler auf den Schirm. Das Fall-FAQ hängt
    dagegen als Wahl an der Freigabe — würde hier ein 403 fliegen, scheiterte die ganze
    Freigabe an einem erschöpften Nebenkontingent, und die Klient:in bekäme für ihren
    eigentlichen Wunsch eine Fehlermeldung.

    Beide Wege zählen über dieselbe Grenze, damit Sperre und Anzeige nicht auseinanderlaufen.
    """
    limit = getattr(settings, _AI_USAGE_LIMITS[kind][0])
    if limit <= 0:
        return True
    return await _count_ai_usage_this_month(user_id, conn, kind) < limit


async def log_ai_usage(user_id: str, conn, kind: str, menge: int = 1) -> None:
    """Verbucht eine erfolgreich ausgeführte KI-Aktion.

    ``menge`` ist für alles, was in Stück zählt, 1 — und bleibt es. Podcasts verbuchen die
    angefangenen Minuten, weil sie auch je Minute kosten.
    """
    await conn.execute(
        "INSERT INTO ai_usage_log (user_id, kind, menge) VALUES ($1, $2, $3)",
        user_id, kind, max(1, int(menge)),
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
            "einheit": _EINHEIT.get(kind),
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
        "SELECT plan, trial_started_at, subscription_ends_at, billing_source "
        "FROM user_profiles WHERE user_id = $1",
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
            "billing_source": None,
            "billing_label": None,
            "manageable_by_user": False,
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

    # Woher der Zugang stammt, entscheidet, was die Oberfläche anbieten darf: Ein Abo
    # aus einem App-Store kündigt man dort, nicht bei uns.
    from app.services.billing_entitlement import PROVIDERS, provider_label
    source = row["billing_source"]

    return {
        "plan": plan,
        "is_trial_active": is_trial_active,
        "trial_days_left": trial_days_left,
        "trial_ends_at": trial_ends_at.isoformat() if trial_ends_at else None,
        "subscription_ends_at": sub_ends.isoformat() if sub_ends else None,
        "is_active": is_active,
        "billing_source": source,
        "billing_label": provider_label(source) if source else None,
        "manageable_by_user": bool(
            is_paid_active and PROVIDERS.get(source or "", {}).get("manageable_by_user")
        ),
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

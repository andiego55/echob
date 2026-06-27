"""Sitz-/Abrechnungslogik: **Verbrauch pro Abrechnungsmonat** (Ledger-basiert).

Werteinheit = ein im laufenden Abrechnungszeitraum der Org (``organizations.current_period_start``)
AKTIVIERTER, distinkter Fall. Regeln:

- Aktivieren eines im Zeitraum noch nicht verbrauchten Falls → verbraucht eine Einheit, sofern das
  Tarif-Kontingent (``included_cases``) frei ist; sonst ``UPGRADE_REQUIRED``.
- Re-Aktivierung desselben Falls im selben Zeitraum → **gratis** (zählt nicht doppelt).
- Abschließen/Archivieren (``release_case``) schließt die Belegung (Werkzeuge zu), gibt die Einheit im
  laufenden Zeitraum aber **NICHT** zurück.
- Laufende Fälle re-konsumieren je Zeitraum erneut eine Einheit (Periodenwechsel = Reset).
- Demo (``case_shares.is_demo``) zählt nie.

Quelle der Wahrheit ist das Ledger ``case_activations`` (nachvollziehbar/auditierbar);
``case_shares.activated_at`` wird als Anzeige-Denormalisierung mitgeführt.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException

from app.services.pro_billing_service import included_cases

_ACTIVE_SUB = ("active", "trialing")


def _month_start(dt: datetime | None = None) -> datetime:
    """Kalendermonats-Anker (UTC) als Fallback, falls keine Stripe-Periode gesetzt ist."""
    dt = dt or datetime.now(timezone.utc)
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


async def period_start(org_id, conn) -> datetime:
    """Beginn des laufenden Abrechnungszeitraums (Stripe-Periode; Fallback Kalendermonat)."""
    cps = await conn.fetchval(
        "SELECT current_period_start FROM organizations WHERE id = $1", org_id)
    return cps or _month_start()


async def count_consumed_this_period(org_id, conn, period=None) -> int:
    """Distinkte (nicht-Demo) Fälle, die im laufenden Zeitraum aktiviert wurden = verbrauchte Einheiten."""
    period = period or await period_start(org_id, conn)
    return await conn.fetchval(
        "SELECT count(DISTINCT case_id) FROM case_activations "
        "WHERE org_id = $1 AND billing_period_start = $2",
        org_id, period,
    )


async def count_currently_active(org_id, conn, period=None) -> int:
    """Aktuell offene Belegungen (Werkzeuge offen) im laufenden Zeitraum."""
    period = period or await period_start(org_id, conn)
    return await conn.fetchval(
        "SELECT count(*) FROM case_activations "
        "WHERE org_id = $1 AND billing_period_start = $2 AND released_at IS NULL",
        org_id, period,
    )


async def get_org_billing(org_id, conn) -> dict:
    """Abrechnungs-Status der Org: plan, Abo-Status, verbrauchte/inkludierte Einheiten."""
    row = await conn.fetchrow(
        "SELECT plan, subscription_status, subscription_ends_at, current_period_start, stripe_customer_id "
        "FROM organizations WHERE id = $1",
        org_id,
    )
    plan = row["plan"] if row else "free"
    status = row["subscription_status"] if row else None
    period = (row["current_period_start"] if row else None) or _month_start()
    return {
        "plan": plan,
        "status": status,
        "subscription_active": status in _ACTIVE_SUB,
        "active_cases": await count_consumed_this_period(org_id, conn, period),   # verbrauchte Einheiten
        "currently_active": await count_currently_active(org_id, conn, period),
        "included": included_cases(plan),
        "period_start": period,
        "stripe_customer_id": row["stripe_customer_id"] if row else None,
        "subscription_ends_at": row["subscription_ends_at"] if row else None,
    }


async def _share(case_id, current, conn):
    return await conn.fetchrow(
        "SELECT is_demo FROM case_shares "
        "WHERE professional_user_id = $1 AND case_id = $2 AND status = 'active'",
        current["user_id"], case_id,
    )


async def _has_open_row(org_id, case_id, period, conn) -> bool:
    return bool(await conn.fetchval(
        "SELECT 1 FROM case_activations "
        "WHERE org_id = $1 AND case_id = $2 AND billing_period_start = $3 AND released_at IS NULL LIMIT 1",
        org_id, case_id, period,
    ))


async def _has_consumed_row(org_id, case_id, period, conn) -> bool:
    return bool(await conn.fetchval(
        "SELECT 1 FROM case_activations "
        "WHERE org_id = $1 AND case_id = $2 AND billing_period_start = $3 LIMIT 1",
        org_id, case_id, period,
    ))


async def assert_case_workable(case_id, current, conn) -> None:
    """Gate für fall-gebundene Profi-Werkzeuge. Demo frei; sonst Abo aktiv + Fall im laufenden
    Zeitraum **offen aktiviert** (sonst 402 SEAT_REQUIRED / PLAN_REQUIRED)."""
    share = await _share(case_id, current, conn)
    if not share:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    if share["is_demo"]:
        return
    org_id = current["org_id"]
    row = await conn.fetchrow(
        "SELECT subscription_status, current_period_start FROM organizations WHERE id = $1", org_id)
    if not row or row["subscription_status"] not in _ACTIVE_SUB:
        raise HTTPException(status_code=402, detail="PLAN_REQUIRED")
    period = row["current_period_start"] or _month_start()
    if not await _has_open_row(org_id, case_id, period, conn):
        raise HTTPException(status_code=402, detail="SEAT_REQUIRED")


async def activate_case(case_id, current, conn) -> None:
    """Aktiviert einen Fall im laufenden Zeitraum (öffnet/erneuert die Belegung).

    Neuer Fall (im Zeitraum noch nicht verbraucht) → verbraucht eine Einheit, wenn Kontingent frei;
    bereits verbraucht → gratis. Demo / bereits offen → no-op.
    """
    org_id = current["org_id"]
    share = await _share(case_id, current, conn)
    if not share:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    if share["is_demo"]:
        return
    billing = await get_org_billing(org_id, conn)
    if not billing["subscription_active"]:
        raise HTTPException(status_code=402, detail="PLAN_REQUIRED")
    period = billing["period_start"]
    if await _has_open_row(org_id, case_id, period, conn):
        return  # bereits offen aktiv
    already_consumed = await _has_consumed_row(org_id, case_id, period, conn)
    if not already_consumed and billing["active_cases"] >= billing["included"]:
        raise HTTPException(status_code=402, detail="UPGRADE_REQUIRED")
    await conn.execute(
        "INSERT INTO case_activations "
        "(org_id, case_id, professional_user_id, billing_period_start) VALUES ($1, $2, $3, $4)",
        org_id, case_id, current["user_id"], period,
    )
    await conn.execute(
        "UPDATE case_shares SET activated_at = NOW() "
        "WHERE professional_user_id = $1 AND case_id = $2",
        current["user_id"], case_id,
    )


async def release_case(case_id, current, conn, *, reason: str = "manual") -> None:
    """Schließt die offene Belegung (Werkzeuge zu). Die im Zeitraum verbrauchte Einheit bleibt."""
    org_id = current["org_id"]
    period = await period_start(org_id, conn)
    await conn.execute(
        "UPDATE case_activations SET released_at = NOW(), release_reason = $4 "
        "WHERE org_id = $1 AND case_id = $2 AND billing_period_start = $3 AND released_at IS NULL",
        org_id, case_id, period, reason,
    )
    await conn.execute(
        "UPDATE case_shares SET activated_at = NULL "
        "WHERE professional_user_id = $1 AND case_id = $2 AND is_demo = false",
        current["user_id"], case_id,
    )


# Rückwärtskompatibler Alias (org_billing-Router ruft deactivate_case).
deactivate_case = release_case

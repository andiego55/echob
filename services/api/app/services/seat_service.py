"""Sitz-/Gating-Logik: Profi-Werkzeuge nur bei aktivem Org-Abo + aktiviertem Fall.

Der Beispielfall (case_shares.is_demo) ist immer frei und zählt nie als Sitz. Aktivierte
Fälle (activated_at) zählen gegen das Tarif-Kontingent (included_cases je plan).
"""
from __future__ import annotations

from fastapi import HTTPException

from app.services.pro_billing_service import included_cases

_ACTIVE_SUB = ("active", "trialing")


async def count_active_cases(org_id, conn) -> int:
    """Aktive (nicht-Demo) Sitze über alle Org-Mitglieder."""
    return await conn.fetchval(
        "SELECT count(*) FROM case_shares s "
        "JOIN organization_members m ON m.professional_user_id = s.professional_user_id "
        "WHERE m.org_id = $1 AND s.status = 'active' AND s.is_demo = false "
        "AND s.activated_at IS NOT NULL",
        org_id,
    )


async def get_org_billing(org_id, conn) -> dict:
    """Abrechnungs-Status der Org: plan, Abo-Status, aktive/inkludierte Fälle."""
    row = await conn.fetchrow(
        "SELECT plan, subscription_status, subscription_ends_at, stripe_customer_id "
        "FROM organizations WHERE id = $1",
        org_id,
    )
    plan = row["plan"] if row else "free"
    status = row["subscription_status"] if row else None
    active = await count_active_cases(org_id, conn)
    return {
        "plan": plan,
        "status": status,
        "subscription_active": status in _ACTIVE_SUB,
        "active_cases": active,
        "included": included_cases(plan),
        "stripe_customer_id": row["stripe_customer_id"] if row else None,
        "subscription_ends_at": row["subscription_ends_at"] if row else None,
    }


async def _share(case_id, current, conn):
    return await conn.fetchrow(
        "SELECT is_demo, activated_at FROM case_shares "
        "WHERE professional_user_id = $1 AND case_id = $2 AND status = 'active'",
        current["user_id"], case_id,
    )


async def assert_case_workable(case_id, current, conn) -> None:
    """Gate für fall-gebundene Profi-Werkzeuge. Demo frei; sonst Abo aktiv + Fall aktiviert."""
    share = await _share(case_id, current, conn)
    if not share:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    if share["is_demo"]:
        return
    billing = await get_org_billing(current["org_id"], conn)
    if not billing["subscription_active"]:
        raise HTTPException(status_code=402, detail="PLAN_REQUIRED")
    if share["activated_at"] is None:
        raise HTTPException(status_code=402, detail="SEAT_REQUIRED")


async def activate_case(case_id, current, conn) -> None:
    """Aktiviert einen Fall (Sitz), wenn Abo aktiv + Kontingent frei."""
    share = await _share(case_id, current, conn)
    if not share:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    if share["is_demo"] or share["activated_at"] is not None:
        return  # Demo bzw. bereits aktiv → no-op
    billing = await get_org_billing(current["org_id"], conn)
    if not billing["subscription_active"]:
        raise HTTPException(status_code=402, detail="PLAN_REQUIRED")
    if billing["active_cases"] >= billing["included"]:
        raise HTTPException(status_code=402, detail="UPGRADE_REQUIRED")
    await conn.execute(
        "UPDATE case_shares SET activated_at = NOW() "
        "WHERE professional_user_id = $1 AND case_id = $2",
        current["user_id"], case_id,
    )


async def deactivate_case(case_id, current, conn) -> None:
    """Gibt den Sitz wieder frei (Demo unberührt)."""
    await conn.execute(
        "UPDATE case_shares SET activated_at = NULL "
        "WHERE professional_user_id = $1 AND case_id = $2 AND is_demo = false",
        current["user_id"], case_id,
    )

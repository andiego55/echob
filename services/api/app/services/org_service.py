"""Organisationen/Praxen — genau eine Org je Fachperson (Solo = 1-Mitglied-Org).

ensure_org_for_professional ist idempotent + nebenläufigkeitssicher und wird in
get_current_professional (lazy → deckt Bestandskonten ab) sowie in register aufgerufen.
Fall-Zugriff bleibt davon unberührt (least-access über case_shares).
"""
from __future__ import annotations


async def get_org(pid, conn) -> dict | None:
    """{org_id, role} der Fachperson, oder None."""
    row = await conn.fetchrow(
        "SELECT org_id, role FROM organization_members WHERE professional_user_id = $1", pid,
    )
    return {"org_id": row["org_id"], "role": row["role"]} if row else None


async def ensure_org_for_professional(pid, conn, display_name: str | None = None) -> dict:
    """Sorgt für Org + Owner-Mitgliedschaft der Fachperson. Gibt {org_id, role}."""
    existing = await get_org(pid, conn)
    if existing:
        return existing

    name = (display_name or "").strip() or "Meine Praxis"
    org_id = await conn.fetchval(
        "INSERT INTO organizations (name, owner_user_id) VALUES ($1, $2) RETURNING id", name, pid,
    )
    inserted = await conn.fetchrow(
        "INSERT INTO organization_members (org_id, professional_user_id, role) "
        "VALUES ($1, $2, 'owner') ON CONFLICT (professional_user_id) DO NOTHING "
        "RETURNING org_id, role",
        org_id, pid,
    )
    if inserted is None:
        # Race: parallele Anlage gewann → verwaiste neue Org löschen.
        await conn.execute("DELETE FROM organizations WHERE id = $1", org_id)
        return await get_org(pid, conn)
    return {"org_id": inserted["org_id"], "role": inserted["role"]}

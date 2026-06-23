"""Router: Organisation / Praxis — /professional/org

Mitglieder-/Rollenverwaltung einer Praxis (Vertrieb Phase 2). Jede Fachperson gehört zu genau
einer Org (Solo = 1-Mitglied). Schreibaktionen nur für owner/admin. **Kein** zusätzlicher
Fall-Zugriff: Fallinhalte bleiben least-access über case_shares (unberührt).
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_professional, get_pool
from app.schemas.professional import (
    OrganizationResponse,
    OrgInviteResponse,
    OrgMember,
    OrgMemberInvite,
    OrgRename,
    OrgRoleUpdate,
)
from app.services.invite_service import send_invite_email
from app.services.org_service import ensure_org_for_professional

router = APIRouter(prefix="/professional/org", tags=["professional-org"])


def _require_admin(current: dict) -> None:
    if current.get("org_role") not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Nur Praxis-Verwaltung (Inhaber:in/Admin).")


def _norm_email(email: str) -> str:
    e = (email or "").strip().lower()
    if "@" not in e or "." not in e.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Ungültige E-Mail-Adresse.")
    return e


async def _org_response(org_id, role, conn) -> OrganizationResponse:
    org = await conn.fetchrow("SELECT id, name, plan FROM organizations WHERE id = $1", org_id)
    members = await conn.fetch(
        "SELECT m.professional_user_id AS user_id, m.role, p.display_name, p.email "
        "FROM organization_members m "
        "LEFT JOIN professional_profiles p ON p.user_id = m.professional_user_id "
        "WHERE m.org_id = $1 ORDER BY (m.role = 'owner') DESC, p.display_name NULLS LAST",
        org_id,
    )
    return OrganizationResponse(
        id=org["id"], name=org["name"], plan=org["plan"], role=role,
        members=[
            OrgMember(user_id=m["user_id"], display_name=m["display_name"],
                      email=m["email"], role=m["role"])
            for m in members
        ],
    )


@router.get("", response_model=OrganizationResponse)
async def get_org(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> OrganizationResponse:
    async with pool.acquire() as conn:
        return await _org_response(current["org_id"], current["org_role"], conn)


@router.patch("", response_model=OrganizationResponse)
async def rename_org(
    body: OrgRename,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> OrganizationResponse:
    _require_admin(current)
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE organizations SET name = $2, updated_at = NOW() WHERE id = $1",
            current["org_id"], body.name.strip(),
        )
        return await _org_response(current["org_id"], current["org_role"], conn)


# ── Mitglieder-Einladungen ────────────────────────────────────────────────────

@router.post("/members/invite", response_model=OrgInviteResponse)
async def invite_member(
    body: OrgMemberInvite,
    request: Request,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> OrgInviteResponse:
    _require_admin(current)
    email = _norm_email(body.email)
    async with pool.acquire() as conn:
        already = await conn.fetchrow(
            "SELECT 1 FROM organization_members m "
            "JOIN professional_profiles p ON p.user_id = m.professional_user_id "
            "WHERE m.org_id = $1 AND lower(p.email) = $2",
            current["org_id"], email,
        )
        if already:
            raise HTTPException(status_code=422, detail="Diese Person ist bereits Mitglied.")
        row = await conn.fetchrow(
            "INSERT INTO organization_invites (org_id, email, invited_by_user_id, status) "
            "VALUES ($1, $2, $3, 'pending') "
            "ON CONFLICT (org_id, email) DO UPDATE SET status = 'pending', "
            "  invited_by_user_id = EXCLUDED.invited_by_user_id RETURNING *",
            current["org_id"], email, current["user_id"],
        )
        org = await conn.fetchrow("SELECT name FROM organizations WHERE id = $1", current["org_id"])
    send_invite_email(getattr(request.app.state, "supabase", None), email)
    return OrgInviteResponse(
        id=row["id"], org_name=org["name"], email=email,
        status=row["status"], created_at=row["created_at"],
    )


@router.get("/invites", response_model=list[OrgInviteResponse])
async def list_incoming_invites(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[OrgInviteResponse]:
    """Offene Einladungen an die eigene E-Mail (in eine ANDERE Praxis)."""
    email = (current["professional"].get("email") or "").lower()
    if not email:
        return []
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT i.id, i.email, i.status, i.created_at, o.name AS org_name "
            "FROM organization_invites i JOIN organizations o ON o.id = i.org_id "
            "WHERE lower(i.email) = $1 AND i.status = 'pending' AND i.org_id <> $2 "
            "ORDER BY i.created_at DESC",
            email, current["org_id"],
        )
    return [
        OrgInviteResponse(id=r["id"], org_name=r["org_name"], email=r["email"],
                          status=r["status"], created_at=r["created_at"])
        for r in rows
    ]


@router.post("/invites/{invite_id}/accept", response_model=OrganizationResponse)
async def accept_invite(
    invite_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> OrganizationResponse:
    pid = current["user_id"]
    email = (current["professional"].get("email") or "").lower()
    async with pool.acquire() as conn:
        inv = await conn.fetchrow(
            "SELECT id, org_id, email FROM organization_invites "
            "WHERE id = $1 AND status = 'pending'",
            invite_id,
        )
        if not inv or (inv["email"] or "").lower() != email:
            raise HTTPException(status_code=404, detail="Einladung nicht gefunden.")
        old_org_id = current["org_id"]
        if old_org_id == inv["org_id"]:
            raise HTTPException(status_code=422, detail="Bereits Mitglied dieser Praxis.")
        # Inhaber:in einer Praxis mit weiteren Mitgliedern darf nicht einfach wechseln.
        if current["org_role"] == "owner":
            count = await conn.fetchval(
                "SELECT count(*) FROM organization_members WHERE org_id = $1", old_org_id)
            if count > 1:
                raise HTTPException(
                    status_code=422,
                    detail="Sie sind Inhaber:in einer Praxis mit Mitgliedern. "
                           "Bitte zuerst übergeben.",
                )
        await conn.execute(
            "UPDATE organization_members SET org_id = $2, role = 'member' "
            "WHERE professional_user_id = $1",
            pid, inv["org_id"],
        )
        await conn.execute(
            "UPDATE organization_invites SET status = 'accepted', accepted_at = NOW() "
            "WHERE id = $1",
            invite_id,
        )
        # verwaiste alte (Solo-)Org aufräumen, falls leer
        await conn.execute(
            "DELETE FROM organizations o WHERE o.id = $1 "
            "AND NOT EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = o.id)",
            old_org_id,
        )
        return await _org_response(inv["org_id"], "member", conn)


@router.delete("/invites/{invite_id}")
async def cancel_invite(
    invite_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    _require_admin(current)
    async with pool.acquire() as conn:
        res = await conn.execute(
            "DELETE FROM organization_invites WHERE id = $1 AND org_id = $2 AND status = 'pending'",
            invite_id, current["org_id"],
        )
    if res == "DELETE 0":
        raise HTTPException(status_code=404, detail="Einladung nicht gefunden.")
    return {"deleted": True}


# ── Mitglieder ────────────────────────────────────────────────────────────────

@router.post("/members/{member_user_id}/role")
async def set_member_role(
    member_user_id: UUID,
    body: OrgRoleUpdate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    _require_admin(current)
    async with pool.acquire() as conn:
        m = await conn.fetchrow(
            "SELECT role FROM organization_members WHERE professional_user_id = $1 AND org_id = $2",
            member_user_id, current["org_id"],
        )
        if not m:
            raise HTTPException(status_code=404, detail="Mitglied nicht gefunden.")
        if m["role"] == "owner":
            raise HTTPException(status_code=422, detail="Inhaber:in-Rolle ist nicht änderbar.")
        await conn.execute(
            "UPDATE organization_members SET role = $3 "
            "WHERE professional_user_id = $1 AND org_id = $2",
            member_user_id, current["org_id"], body.role,
        )
    return {"updated": True}


@router.delete("/members/{member_user_id}")
async def remove_member(
    member_user_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    _require_admin(current)
    if str(member_user_id) == str(current["user_id"]):
        raise HTTPException(status_code=422, detail="Sie können sich nicht selbst entfernen.")
    async with pool.acquire() as conn:
        m = await conn.fetchrow(
            "SELECT role FROM organization_members WHERE professional_user_id = $1 AND org_id = $2",
            member_user_id, current["org_id"],
        )
        if not m:
            raise HTTPException(status_code=404, detail="Mitglied nicht gefunden.")
        if m["role"] == "owner":
            raise HTTPException(status_code=422, detail="Inhaber:in kann nicht entfernt werden.")
        await conn.execute(
            "DELETE FROM organization_members WHERE professional_user_id = $1 AND org_id = $2",
            member_user_id, current["org_id"],
        )
        prof = await conn.fetchrow(
            "SELECT display_name FROM professional_profiles WHERE user_id = $1", member_user_id)
        # Entferntes Mitglied darf nicht org-los bleiben → eigene Solo-Org.
        await ensure_org_for_professional(
            member_user_id, conn, prof["display_name"] if prof else None)
    return {"removed": True}

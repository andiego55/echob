"""Router: Klient-Einladungen (Fachperson → Person).

Fachperson (auth = Fachpersonen-Zugang):
  POST   /professional/client-invites        – neue Einladung (Token + Code)
  GET    /professional/client-invites        – eigene Einladungen
  DELETE /professional/client-invites/{id}   – offene Einladung zurückziehen

Person:
  GET  /client-invites/{token}   – öffentliche Sicht für die Landingpage
  POST /client-invites/accept    – annehmen (per Token aus dem Link oder Code)
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_professional, get_current_user, get_pool
from app.schemas.client_invite import (
    ClientInviteAccept,
    ClientInviteAcceptResponse,
    ClientInviteCreate,
    ClientInvitePublic,
    ClientInviteResponse,
)
from app.services.client_invite_service import (
    accept_client_invite,
    create_client_invite,
    get_public_invite,
    list_client_invites,
    revoke_client_invite,
)

router = APIRouter(tags=["client-invites"])


def _to_response(rec) -> ClientInviteResponse:
    return ClientInviteResponse(
        id=rec["id"], token=rec["token"], code=rec["code"], label=rec["label"],
        status=rec["status"], accepted_display_name=None,
        created_at=rec["created_at"], accepted_at=rec["accepted_at"],
    )


# ── Fachperson ────────────────────────────────────────────────────────────────

@router.post("/professional/client-invites", response_model=ClientInviteResponse, status_code=201)
async def create_invite(
    body: ClientInviteCreate,
    current=Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ClientInviteResponse:
    async with pool.acquire() as conn:
        rec = await create_client_invite(
            conn, current["user_id"], current.get("org_id"), body.label,
        )
    return _to_response(rec)


@router.get("/professional/client-invites", response_model=list[ClientInviteResponse])
async def list_invites(
    current=Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[ClientInviteResponse]:
    async with pool.acquire() as conn:
        rows = await list_client_invites(conn, current["user_id"])
    return [_to_response(r) for r in rows]


@router.delete("/professional/client-invites/{invite_id}")
async def revoke_invite(
    invite_id: UUID,
    current=Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        ok = await revoke_client_invite(conn, current["user_id"], invite_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Einladung nicht gefunden.")
    return {"revoked": True}


# ── Person ────────────────────────────────────────────────────────────────────

@router.get("/client-invites/{token}", response_model=ClientInvitePublic)
async def public_invite(token: str, pool=Depends(get_pool)) -> ClientInvitePublic:
    async with pool.acquire() as conn:
        data = await get_public_invite(conn, token)
    if data is None:
        raise HTTPException(status_code=404, detail="Einladung nicht gefunden.")
    return ClientInvitePublic(**data)


_ACCEPT_ERRORS = {
    "not_found":     (404, "Einladung nicht gefunden."),
    "revoked":       (410, "Diese Einladung wurde zurückgezogen."),
    "expired":       (410, "Diese Einladung ist abgelaufen."),
    "used_by_other": (409, "Diese Einladung wurde bereits verwendet."),
    "self_invite":   (400, "Sie können Ihre eigene Einladung nicht annehmen."),
}


@router.post("/client-invites/accept", response_model=ClientInviteAcceptResponse)
async def accept_invite(
    body: ClientInviteAccept,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ClientInviteAcceptResponse:
    if not body.token and not body.code:
        raise HTTPException(status_code=422, detail="Token oder Code erforderlich.")
    async with pool.acquire() as conn:
        async with conn.transaction():
            status, payload = await accept_client_invite(
                conn, body.token, body.code, current_user["user_id"], current_user.get("email"),
            )
    if status != "ok":
        code, detail = _ACCEPT_ERRORS.get(
            status, (400, "Einladung konnte nicht angenommen werden."),
        )
        raise HTTPException(status_code=code, detail=detail)
    return ClientInviteAcceptResponse(
        connected=True,
        already=payload.get("already", False),
        professional_user_id=payload.get("professional_user_id"),
        professional_display_name=payload.get("professional_display_name"),
    )

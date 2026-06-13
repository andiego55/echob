"""Router: Freigaben eines Falls (nutzerseitig) — /cases/{case_id}/shares

Nur Eigentümer:innen eines Falls können Freigaben anlegen/ändern/widerrufen.
Freigaben sind nur an verbundene (accepted) Fachpersonen möglich.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user, get_pool
from app.schemas.professional import (
    ShareCreate,
    ShareUpdate,
    CaseShareResponse,
    ShareElementResponse,
)

router = APIRouter(prefix="/cases/{case_id}/shares", tags=["shares"])


async def _require_owned_case(conn, case_id, user_id) -> None:
    row = await conn.fetchrow(
        "SELECT id FROM cases WHERE id = $1 AND user_id = $2", case_id, user_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")


async def _set_elements(conn, share_id, case_id, elements, scene_ids) -> None:
    """Setzt die freigegebenen Elemente neu (delete + insert)."""
    await conn.execute("DELETE FROM case_share_elements WHERE share_id = $1", share_id)
    for et in {e for e in elements if e != "scene"}:
        await conn.execute(
            "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1, $2)",
            share_id, et,
        )
    if "scene" in elements and scene_ids:
        # Nur Szenen-IDs zulassen, die wirklich zu diesem Fall gehören
        valid = await conn.fetch(
            "SELECT id FROM scenes WHERE case_id = $1 AND id = ANY($2::uuid[])",
            case_id, scene_ids,
        )
        for r in valid:
            await conn.execute(
                "INSERT INTO case_share_elements (share_id, element_type, scene_id) "
                "VALUES ($1, 'scene', $2)",
                share_id, r["id"],
            )


async def _build_share_response(conn, share_row) -> CaseShareResponse:
    elem_rows = await conn.fetch(
        "SELECT element_type, scene_id FROM case_share_elements WHERE share_id = $1",
        share_row["id"],
    )
    pro = await conn.fetchrow(
        "SELECT display_name FROM professional_profiles WHERE user_id = $1",
        share_row["professional_user_id"],
    )
    return CaseShareResponse(
        id=share_row["id"],
        case_id=share_row["case_id"],
        professional_user_id=share_row["professional_user_id"],
        professional_display_name=pro["display_name"] if pro else None,
        status=share_row["status"],
        message=share_row["message"],
        elements=[
            ShareElementResponse(element_type=e["element_type"], scene_id=e["scene_id"])
            for e in elem_rows
        ],
        created_at=share_row["created_at"],
        updated_at=share_row["updated_at"],
    )


@router.get("", response_model=list[CaseShareResponse])
async def list_shares(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[CaseShareResponse]:
    uid = current_user["user_id"]
    async with pool.acquire() as conn:
        await _require_owned_case(conn, case_id, uid)
        rows = await conn.fetch(
            "SELECT * FROM case_shares WHERE case_id = $1 AND owner_user_id = $2 "
            "ORDER BY created_at DESC",
            case_id, uid,
        )
        return [await _build_share_response(conn, r) for r in rows]


@router.post("", response_model=CaseShareResponse)
async def create_share(
    case_id: UUID,
    body: ShareCreate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseShareResponse:
    uid = current_user["user_id"]
    async with pool.acquire() as conn:
        await _require_owned_case(conn, case_id, uid)
        connected = await conn.fetchrow(
            "SELECT 1 FROM professional_invites "
            "WHERE inviter_user_id = $1 AND professional_user_id = $2 AND status = 'accepted'",
            uid, body.professional_user_id,
        )
        if not connected:
            raise HTTPException(
                status_code=400,
                detail="Diese Fachperson ist nicht mit deinem Konto verbunden.",
            )
        async with conn.transaction():
            share = await conn.fetchrow(
                """
                INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status, message)
                VALUES ($1, $2, $3, 'active', $4)
                ON CONFLICT (case_id, professional_user_id) DO UPDATE SET
                  status = 'active', message = EXCLUDED.message, updated_at = NOW(), revoked_at = NULL
                RETURNING *
                """,
                case_id, uid, body.professional_user_id, body.message,
            )
            await _set_elements(conn, share["id"], case_id, body.elements, body.scene_ids)
        return await _build_share_response(conn, share)


@router.patch("/{share_id}", response_model=CaseShareResponse)
async def update_share(
    case_id: UUID,
    share_id: UUID,
    body: ShareUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseShareResponse:
    uid = current_user["user_id"]
    async with pool.acquire() as conn:
        share = await conn.fetchrow(
            "SELECT id FROM case_shares WHERE id = $1 AND case_id = $2 AND owner_user_id = $3",
            share_id, case_id, uid,
        )
        if not share:
            raise HTTPException(status_code=404, detail="Freigabe nicht gefunden.")
        async with conn.transaction():
            await conn.execute(
                "UPDATE case_shares SET message = $2, status = 'active', "
                "updated_at = NOW(), revoked_at = NULL WHERE id = $1",
                share_id, body.message,
            )
            await _set_elements(conn, share_id, case_id, body.elements, body.scene_ids)
            share = await conn.fetchrow("SELECT * FROM case_shares WHERE id = $1", share_id)
        return await _build_share_response(conn, share)


@router.delete("/{share_id}")
async def revoke_share(
    case_id: UUID,
    share_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Widerruf: status='revoked'. Danach kein Zugriff der Fachperson mehr (404)."""
    uid = current_user["user_id"]
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE case_shares SET status = 'revoked', revoked_at = NOW(), updated_at = NOW() "
            "WHERE id = $1 AND case_id = $2 AND owner_user_id = $3 AND status = 'active'",
            share_id, case_id, uid,
        )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Freigabe nicht gefunden.")
    return {"revoked": True}

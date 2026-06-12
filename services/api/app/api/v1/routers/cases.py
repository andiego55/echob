"""Router: Fälle (Cases) — /api/v1/cases"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user, get_pool
from app.schemas.case import CaseCreate, CaseListResponse, CaseResponse, CaseUpdate
from app.services.subscription_service import enforce_trial_limits

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("", response_model=CaseListResponse)
async def list_cases(
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseListResponse:
    """Alle Fälle des eingeloggten Nutzers, sortiert nach letzter Aktivität."""
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT c.*,
                   (SELECT COUNT(*) FROM scenes s WHERE s.case_id = c.id)::int AS scene_count,
                   GREATEST(
                       c.created_at,
                       COALESCE((SELECT MAX(s.created_at) FROM scenes s WHERE s.case_id = c.id), c.created_at),
                       COALESCE((SELECT MAX(m.created_at) FROM echo_messages m WHERE m.case_id = c.id), c.created_at)
                   ) AS last_activity_at
            FROM cases c
            WHERE c.user_id = $1 AND c.archived_at IS NULL
            ORDER BY last_activity_at DESC
            """,
            user_id,
        )
        chat_session_count = await conn.fetchval(
            "SELECT COUNT(*) FROM echo_chat_sessions WHERE user_id = $1", user_id
        )
    cases = [CaseResponse(**dict(r)) for r in rows]
    return CaseListResponse(cases=cases, total=len(cases), chat_session_count=chat_session_count or 0)


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    body: CaseCreate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseResponse:
    """Neuen Fall anlegen."""
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        await enforce_trial_limits(user_id, conn, check_case=True)
        row = await conn.fetchrow(
            """
            INSERT INTO cases (user_id, relationship_type, relationship_status,
                               contact_frequency, main_concern)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            user_id,
            body.relationship_type,
            body.relationship_status,
            body.contact_frequency,
            body.main_concern,
        )
    logger.info("Fall erstellt: case_id=%s user_id=%s", row["id"], user_id)
    return CaseResponse(**dict(row))


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseResponse:
    """Einzelnen Fall abrufen."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM cases WHERE id = $1 AND user_id = $2",
            case_id,
            current_user["user_id"],
        )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    return CaseResponse(**dict(row))


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: UUID,
    body: CaseUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseResponse:
    """Fall aktualisieren (Partial Update)."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen angegeben.")

    set_clauses = ", ".join(
        f"{k} = ${i + 2}" for i, k in enumerate(updates.keys())
    )
    values = list(updates.values())

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"""
            UPDATE cases SET {set_clauses}, updated_at = NOW()
            WHERE id = $1 AND user_id = ${len(values) + 2}
            RETURNING *
            """,
            case_id,
            *values,
            current_user["user_id"],
        )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    return CaseResponse(**dict(row))


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_case(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    """Fall archivieren (Soft-Delete via archived_at)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE cases SET archived_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id",
            case_id,
            current_user["user_id"],
        )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

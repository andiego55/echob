"""Router: Onboarding — /api/v1/cases/{case_id}/onboarding"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/onboarding", tags=["onboarding"])


class OnboardingAnswers(BaseModel):
    person_name: str | None = None
    relationship_description: str | None = None
    main_burden: str | None = None
    typical_scenes: str | None = None
    significant_event: str | None = None
    memorable_scenes: str | None = None
    distress_score: int | None = None
    safety_status: str | None = None


class OnboardingResponse(OnboardingAnswers):
    id: UUID
    case_id: UUID
    completed_at: str | None = None

    model_config = {"from_attributes": True}


@router.get("", response_model=OnboardingResponse | None)
async def get_onboarding(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
):
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            "SELECT * FROM onboarding_answers WHERE case_id = $1", case_id
        )
    if not row:
        return None
    return _row_to_response(row)


@router.put("", response_model=OnboardingResponse)
async def save_onboarding(
    case_id: UUID,
    body: OnboardingAnswers,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
):
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, user_id, conn)
        row = await conn.fetchrow(
            """
            INSERT INTO onboarding_answers
              (case_id, user_id, person_name, relationship_description, main_burden,
               typical_scenes, significant_event, memorable_scenes,
               distress_score, safety_status, completed_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
            ON CONFLICT (case_id) DO UPDATE SET
              person_name            = EXCLUDED.person_name,
              relationship_description = EXCLUDED.relationship_description,
              main_burden            = EXCLUDED.main_burden,
              typical_scenes         = EXCLUDED.typical_scenes,
              significant_event      = EXCLUDED.significant_event,
              memorable_scenes       = EXCLUDED.memorable_scenes,
              distress_score         = EXCLUDED.distress_score,
              safety_status          = EXCLUDED.safety_status,
              completed_at           = NOW(),
              updated_at             = NOW()
            RETURNING *
            """,
            case_id, user_id,
            crypto.encrypt(body.person_name),
            crypto.encrypt(body.relationship_description),
            crypto.encrypt(body.main_burden),
            crypto.encrypt(body.typical_scenes),
            crypto.encrypt(body.significant_event),
            crypto.encrypt(body.memorable_scenes),
            body.distress_score,
            body.safety_status or "none",
        )
    return _row_to_response(row)


async def _assert_case_owner(case_id, user_id, conn):
    row = await conn.fetchrow(
        "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")


def _row_to_response(row) -> OnboardingResponse:
    d = dict(row)
    completed = d.get("completed_at")
    d["completed_at"] = completed.isoformat() if completed else None
    crypto.decrypt_fields(d, *crypto.ONBOARDING_FIELDS)
    return OnboardingResponse(**d)

"""Router: Rückblicke / Verlauf — /api/v1/cases/{case_id}/reviews

- GET    /trends        → quantitative Trends, live berechnet (kein LLM, kein Speichern)
- GET    ""             → gespeicherte Rückblicke (Narrative)
- POST   ""             → neuen Rückblick erzeugen (Trends-Snapshot + LLM-Narrativ) + speichern
- GET    /{review_id}   → einzelnen Rückblick
- DELETE /{review_id}   → löschen
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.services.review_service import compute_trends, format_trends_for_prompt

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/reviews", tags=["reviews"])

# Kostenschutz: pro Fall begrenzte Anzahl gespeicherter Rückblicke (jeder = 1 LLM-Call).
_MAX_REVIEWS_PER_CASE = 24


class ReviewResponse(BaseModel):
    id: UUID
    case_id: UUID
    period_start: date | None
    period_end: date | None
    narrative: str
    stats: dict
    scene_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewListResponse(BaseModel):
    reviews: list[ReviewResponse]
    total: int


async def _assert_case_owner(case_id, user_id, conn, *, return_row: bool = False):
    row = await conn.fetchrow(
        "SELECT * FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    return row if return_row else None


async def _load_case_data(case_id, conn):
    scene_rows = await conn.fetch(
        "SELECT * FROM scenes WHERE case_id = $1 ORDER BY scene_date ASC NULLS LAST, created_at ASC",
        case_id,
    )
    scale_rows = await conn.fetch("SELECT * FROM scale_scores WHERE case_id = $1", case_id)
    scenes = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scene_rows]
    return scenes, [dict(r) for r in scale_rows]


@router.get("/trends")
async def get_trends(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Live berechnete Trends (Diagramme) — immer aktuell, ohne KI."""
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        scenes, scales = await _load_case_data(case_id, conn)
    return compute_trends(scenes, scales)


@router.get("", response_model=ReviewListResponse)
async def list_reviews(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ReviewListResponse:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        rows = await conn.fetch(
            "SELECT * FROM case_reviews WHERE case_id = $1 ORDER BY created_at DESC", case_id
        )
    return ReviewListResponse(reviews=[_row_to_review(r) for r in rows], total=len(rows))


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    case_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ReviewResponse:
    """Erzeugt einen Rückblick: Trends-Snapshot + LLM-Narrativ über den Verlauf."""
    user_id = current_user["user_id"]
    echo_svc = getattr(request.app.state, "echo_service", None)

    async with pool.acquire() as conn:
        case_row = await _assert_case_owner(case_id, user_id, conn, return_row=True)
        review_count = await conn.fetchval(
            "SELECT COUNT(*) FROM case_reviews WHERE case_id = $1", case_id
        )
        if review_count >= _MAX_REVIEWS_PER_CASE:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Maximal {_MAX_REVIEWS_PER_CASE} Rückblicke pro Fall. Bitte lösche einen, bevor du einen neuen erstellst.",
            )
        scenes, scales = await _load_case_data(case_id, conn)
        onboarding_row = await conn.fetchrow(
            "SELECT * FROM onboarding_answers WHERE case_id = $1", case_id
        )

    confirmed = [s for s in scenes if s.get("confirmed_by_user")]
    if not confirmed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Noch keine bestätigten Szenen — ein Rückblick braucht etwas Material.",
        )

    trends = compute_trends(scenes, scales)
    trend_summary = format_trends_for_prompt(trends)

    if echo_svc:
        narrative = await echo_svc.generate_review(
            case_context=dict(case_row),
            scenes=confirmed,
            scale_scores=scales,
            onboarding=(
                crypto.decrypt_fields(dict(onboarding_row), *crypto.ONBOARDING_FIELDS)
                if onboarding_row else None
            ),
            trend_summary=trend_summary,
        )
    else:
        narrative = "## Rückblick\n\nEcho-Service nicht verfügbar.\n\n" + trend_summary

    period_start = date.fromisoformat(trends["period_start"]) if trends.get("period_start") else None
    period_end = date.fromisoformat(trends["period_end"]) if trends.get("period_end") else None

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO case_reviews (case_id, user_id, period_start, period_end, narrative, stats, scene_count)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
            RETURNING *
            """,
            case_id, user_id, period_start, period_end, narrative, json.dumps(trends), len(confirmed),
        )

    logger.info("Rückblick erstellt: review_id=%s case_id=%s", row["id"], case_id)
    return _row_to_review(row)


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    case_id: UUID,
    review_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ReviewResponse:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            "SELECT * FROM case_reviews WHERE id = $1 AND case_id = $2", review_id, case_id
        )
    if not row:
        raise HTTPException(status_code=404, detail="Rückblick nicht gefunden.")
    return _row_to_review(row)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    case_id: UUID,
    review_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            "DELETE FROM case_reviews WHERE id = $1 AND case_id = $2 RETURNING id", review_id, case_id
        )
    if not row:
        raise HTTPException(status_code=404, detail="Rückblick nicht gefunden.")


def _row_to_review(row) -> ReviewResponse:
    d = dict(row)
    stats = d.get("stats")
    if isinstance(stats, str):
        d["stats"] = json.loads(stats)
    elif stats is None:
        d["stats"] = {}
    return ReviewResponse(**d)

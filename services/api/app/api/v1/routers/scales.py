"""Router: Skalenwerte — /api/v1/cases/{case_id}/scales"""
from __future__ import annotations

import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.schemas.scale import SCALE_DEFINITIONS, SCALE_LABELS, ScalesOverviewResponse
from app.services.subscription_service import enforce_ai_usage_limit, log_ai_usage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/scales", tags=["scales"])


@router.get("", response_model=ScalesOverviewResponse)
async def get_scales(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ScalesOverviewResponse:
    user_id = current_user["user_id"]

    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        scale_rows = await conn.fetch(
            "SELECT * FROM scale_scores WHERE case_id = $1 ORDER BY calculated_at DESC",
            case_id,
        )
        scene_count = await conn.fetchval(
            "SELECT COUNT(*) FROM scenes WHERE case_id = $1 AND confirmed_by_user = true",
            case_id,
        )

    scores = []
    for row in scale_rows:
        d = dict(row)
        src = d.get("source_scene_ids")
        if isinstance(src, str):
            d["source_scene_ids"] = json.loads(src)
        elif src is None:
            d["source_scene_ids"] = []
        d["label"] = SCALE_LABELS.get(d["scale_key"], d["scale_key"])
        scores.append(d)

    total_scenes = scene_count or 0
    quality = (
        "insufficient" if total_scenes == 0 else
        "limited" if total_scenes < 3 else
        "moderate" if total_scenes < 7 else
        "good"
    )

    return ScalesOverviewResponse(
        case_id=case_id,
        scores=scores,
        total_scenes=total_scenes,
        data_quality=quality,
    )


@router.post("/calculate", response_model=ScalesOverviewResponse, status_code=status.HTTP_200_OK)
async def calculate_scales(
    case_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ScalesOverviewResponse:
    """Berechnet alle Skalen per KI und speichert sie."""
    user_id = current_user["user_id"]
    echo_svc = getattr(request.app.state, "echo_service", None)
    if not echo_svc:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")

    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT * FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        # Kostenschutz Entwicklungsphase (nutzerweit, löschfest)
        await enforce_ai_usage_limit(user_id, conn, "scale_calc")

        scenes = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 AND confirmed_by_user = true ORDER BY scene_date DESC NULLS LAST",
            case_id,
        )
        scenes = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scenes]
        onboarding_row = await conn.fetchrow(
            "SELECT * FROM onboarding_answers WHERE case_id = $1", case_id
        )
        person_profile_row = await conn.fetchrow(
            "SELECT * FROM person_profiles WHERE case_id = $1", case_id
        )
        topic_summary_rows = await conn.fetch(
            "SELECT topic, summary_text FROM topic_summaries WHERE case_id = $1", case_id
        )
        hypothesis_rows = await conn.fetch(
            "SELECT hypothesis_type, summary_text FROM case_hypotheses WHERE case_id = $1", case_id
        )
        scene_count = await conn.fetchval(
            "SELECT COUNT(*) FROM scenes WHERE case_id = $1 AND confirmed_by_user = true", case_id
        )

    scales = await echo_svc.calculate_scales(
        case_context=dict(case_row),
        scenes=[dict(r) for r in scenes],
        onboarding=(
            crypto.decrypt_fields(dict(onboarding_row), *crypto.ONBOARDING_FIELDS)
            if onboarding_row else None
        ),
        person_profile=dict(person_profile_row) if person_profile_row else None,
        topic_summaries=[
            crypto.decrypt_fields(dict(r), "summary_text") for r in topic_summary_rows
        ],
        hypotheses=[crypto.decrypt_fields(dict(r), "summary_text") for r in hypothesis_rows],
    )

    # Alle bisherigen Werte ersetzen, neu einfügen
    async with pool.acquire() as conn:
        await log_ai_usage(user_id, conn, "scale_calc")
        await conn.execute(
            "DELETE FROM scale_scores WHERE case_id = $1 AND user_id = $2",
            case_id, user_id,
        )
        for s in scales:
            scale_key = s.get("scale_key", "")
            if scale_key not in SCALE_DEFINITIONS:
                continue
            await conn.execute(
                """
                INSERT INTO scale_scores
                  (case_id, user_id, scale_key, score, scene_count, confidence, source_scene_ids, notes)
                VALUES ($1, $2, $3, $4, $5, $6, '[]'::jsonb, $7)
                """,
                case_id,
                user_id,
                scale_key,
                float(s.get("score", 2.5)),
                int(s.get("scene_count", 0)),
                s.get("confidence", "low"),
                s.get("notes"),
            )

    # Frisch geladene Werte zurückgeben
    async with pool.acquire() as conn:
        scale_rows = await conn.fetch(
            "SELECT * FROM scale_scores WHERE case_id = $1 ORDER BY calculated_at DESC",
            case_id,
        )

    scores_out = []
    for row in scale_rows:
        d = dict(row)
        src = d.get("source_scene_ids")
        if isinstance(src, str):
            d["source_scene_ids"] = json.loads(src)
        elif src is None:
            d["source_scene_ids"] = []
        d["label"] = SCALE_LABELS.get(d["scale_key"], d["scale_key"])
        scores_out.append(d)

    total_scenes = scene_count or 0
    quality = (
        "insufficient" if total_scenes == 0 else
        "limited" if total_scenes < 3 else
        "moderate" if total_scenes < 7 else
        "good"
    )

    return ScalesOverviewResponse(
        case_id=case_id,
        scores=scores_out,
        total_scenes=total_scenes,
        data_quality=quality,
    )

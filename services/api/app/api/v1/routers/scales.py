"""Router: Skalenwerte — /api/v1/cases/{case_id}/scales"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user, get_pool
from app.schemas.scale import SCALE_LABELS, ScalesOverviewResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/scales", tags=["scales"])


@router.get("", response_model=ScalesOverviewResponse)
async def get_scales(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ScalesOverviewResponse:
    """Skalenübersicht für einen Fall abrufen."""
    import json

    user_id = current_user["user_id"]

    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        scale_rows = await conn.fetch(
            "SELECT * FROM scale_scores WHERE case_id = $1",
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
    if total_scenes == 0:
        quality = "insufficient"
    elif total_scenes < 3:
        quality = "limited"
    elif total_scenes < 7:
        quality = "moderate"
    else:
        quality = "good"

    return ScalesOverviewResponse(
        case_id=case_id,
        scores=scores,
        total_scenes=total_scenes,
        data_quality=quality,
    )

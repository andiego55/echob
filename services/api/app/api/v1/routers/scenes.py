"""Router: Beziehungsszenen (Scenes) — /api/v1/cases/{case_id}/scenes"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user, get_pool
from app.schemas.scene import (
    SceneConfirm, SceneCreate, SceneListResponse, SceneResponse, SceneUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/scenes", tags=["scenes"])


async def _assert_case_owner(case_id: UUID, user_id: str, conn) -> None:
    row = await conn.fetchrow(
        "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")


@router.get("", response_model=SceneListResponse)
async def list_scenes(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> SceneListResponse:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        rows = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 ORDER BY scene_date DESC NULLS LAST, created_at DESC",
            case_id,
        )
    scenes = [_row_to_scene(r) for r in rows]
    return SceneListResponse(scenes=scenes, total=len(scenes))


@router.post("", response_model=SceneResponse, status_code=status.HTTP_201_CREATED)
async def create_scene(
    case_id: UUID,
    body: SceneCreate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> SceneResponse:
    user_id = current_user["user_id"]
    import json
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, user_id, conn)
        row = await conn.fetchrow(
            """
            INSERT INTO scenes (case_id, user_id, title, scene_date, description,
                user_reaction, distress_score, safety_level, pattern_tags, input_mode)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
            RETURNING *
            """,
            case_id, user_id, body.title, body.scene_date, body.description,
            body.user_reaction, body.distress_score, body.safety_level,
            json.dumps(body.pattern_tags), body.input_mode,
        )
    logger.info("Szene erstellt: scene_id=%s case_id=%s", row["id"], case_id)
    return _row_to_scene(row)


@router.get("/{scene_id}", response_model=SceneResponse)
async def get_scene(
    case_id: UUID,
    scene_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> SceneResponse:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            "SELECT * FROM scenes WHERE id = $1 AND case_id = $2",
            scene_id, case_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Szene nicht gefunden.")
    return _row_to_scene(row)


@router.patch("/{scene_id}", response_model=SceneResponse)
async def update_scene(
    case_id: UUID,
    scene_id: UUID,
    body: SceneUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> SceneResponse:
    import json
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Änderungen angegeben.")
    # pattern_tags needs JSON serialization
    if "pattern_tags" in updates:
        updates["pattern_tags"] = json.dumps(updates["pattern_tags"])
    set_clauses = ", ".join(f"{k} = ${i + 2}" for i, k in enumerate(updates.keys()))
    values = list(updates.values())
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            f"UPDATE scenes SET {set_clauses}, updated_at = NOW() "
            f"WHERE id = $1 AND case_id = ${len(values) + 2} RETURNING *",
            scene_id, *values, case_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Szene nicht gefunden.")
    return _row_to_scene(row)


@router.post("/{scene_id}/confirm", response_model=SceneResponse)
async def confirm_scene(
    case_id: UUID,
    scene_id: UUID,
    body: SceneConfirm,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> SceneResponse:
    """Nutzer bestätigt KI-Vorschlag für eine Szene."""
    import json
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            """
            UPDATE scenes SET
                pattern_tags = $3::jsonb,
                distress_score = $4,
                safety_level = $5,
                confirmed_by_user = true,
                updated_at = NOW()
            WHERE id = $1 AND case_id = $2
            RETURNING *
            """,
            scene_id, case_id,
            json.dumps(body.pattern_tags), body.distress_score, body.safety_level,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Szene nicht gefunden.")
    return _row_to_scene(row)


@router.delete("/{scene_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scene(
    case_id: UUID,
    scene_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            "DELETE FROM scenes WHERE id = $1 AND case_id = $2 RETURNING id",
            scene_id, case_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Szene nicht gefunden.")


# ── Hilfsfunktion ─────────────────────────────────────────────────────────────

def _row_to_scene(row) -> SceneResponse:
    import json
    d = dict(row)
    tags = d.get("pattern_tags")
    if isinstance(tags, str):
        d["pattern_tags"] = json.loads(tags)
    elif tags is None:
        d["pattern_tags"] = []
    return SceneResponse(**d)

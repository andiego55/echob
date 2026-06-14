"""Router: Beziehungsszenen (Scenes) — /api/v1/cases/{case_id}/scenes"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from app.core.dependencies import get_current_user, get_pool
from app.services.subscription_service import enforce_echo_prompt_limit, enforce_trial_limits
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
        await enforce_trial_limits(user_id, conn, check_scene=True)
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


@router.post("/quick-capture")
async def quick_capture(
    case_id: UUID,
    request: Request,
    text: str = Form(""),
    audio: UploadFile | None = File(None),
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Schnellerfassung: Sprache (Whisper) oder Text → strukturierter Szenen-Entwurf.

    Speichert NICHTS — gibt einen Entwurf zurück, den die nutzende Person im
    Formular prüft, anpasst und dann regulär über POST /scenes speichert.
    """
    user_id = current_user["user_id"]
    echo_svc = getattr(request.app.state, "echo_service", None)

    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT * FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
        await enforce_echo_prompt_limit(user_id, conn)

    transcript = ""
    source_text = (text or "").strip()

    if audio is not None:
        audio_bytes = await audio.read()
        if len(audio_bytes) > 25 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Aufnahme zu groß (max. 25 MB).")
        if echo_svc is None:
            raise HTTPException(status_code=503, detail="Transkription derzeit nicht verfügbar.")
        transcript = await echo_svc.transcribe(
            audio_bytes=audio_bytes, filename=audio.filename or "audio.webm"
        )
        source_text = f"{source_text}\n{transcript}".strip() if source_text else transcript

    if not source_text:
        raise HTTPException(status_code=400, detail="Bitte Text eingeben oder eine Aufnahme machen.")

    if echo_svc is not None:
        extracted = await echo_svc.extract_scene(user_text=source_text, case_context=dict(case_row))
    else:
        extracted = {"title": "", "description": source_text, "pattern_tags": [], "safety_level": "none"}

    draft = {
        "title": (extracted.get("title") or "")[:200],
        "description": extracted.get("description") or source_text,
        "user_reaction": extracted.get("user_reaction"),
        "scene_date": extracted.get("scene_date"),
        "distress_score": extracted.get("distress_score"),
        "safety_level": extracted.get("safety_level") or "none",
        "pattern_tags": extracted.get("pattern_tags") or [],
    }
    return {"transcript": transcript, "draft": draft}


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

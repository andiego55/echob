"""Router: Echo-Chat — /api/v1/cases/{case_id}/echo"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.schemas.echo import EchoChatRequest, EchoChatResponse, EchoMessageResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/echo", tags=["echo"])


def _get_echo_service(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


@router.post("/chat", response_model=EchoChatResponse)
async def chat(
    case_id: UUID,
    body: EchoChatRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> EchoChatResponse:
    """Sendet eine Nachricht an Echo und erhält eine Antwort."""
    user_id = current_user["user_id"]
    echo_svc = _get_echo_service(request)

    async with pool.acquire() as conn:
        # Fall prüfen
        case_row = await conn.fetchrow(
            "SELECT * FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        # Vollständiger Fallkontext für Echo
        onboarding_row = await conn.fetchrow(
            "SELECT * FROM onboarding_answers WHERE case_id = $1", case_id
        )
        scene_rows = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 ORDER BY scene_date DESC NULLS LAST, created_at DESC",
            case_id,
        )
        scale_rows = await conn.fetch(
            "SELECT * FROM scale_scores WHERE case_id = $1", case_id
        )

        # Letzte 20 Nachrichten als Gesprächshistorie
        history_rows = await conn.fetch(
            "SELECT role, content FROM echo_messages "
            "WHERE case_id = $1 AND thread_type = $2 "
            "ORDER BY created_at DESC LIMIT 20",
            case_id, body.thread_type,
        )
        history = [{"role": r["role"], "content": r["content"]} for r in reversed(history_rows)]

    case_context = dict(case_row)
    onboarding = dict(onboarding_row) if onboarding_row else None
    scenes = [dict(r) for r in scene_rows]
    scale_scores = [dict(r) for r in scale_rows]

    # Echo antworten lassen
    answer = await echo_svc.chat(
        user_message=body.message,
        case_context=case_context,
        thread_type=body.thread_type,
        history=history,
        glossary_term=body.glossary_term,
        onboarding=onboarding,
        scenes=scenes,
        scale_scores=scale_scores,
    )

    # Nachrichten speichern
    async with pool.acquire() as conn:
        user_msg_row = await conn.fetchrow(
            """
            INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, related_scene_id)
            VALUES ($1, $2, 'user', $3, $4, $5) RETURNING *
            """,
            case_id, user_id, body.message, body.thread_type, body.related_scene_id,
        )
        assistant_msg_row = await conn.fetchrow(
            """
            INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, related_scene_id)
            VALUES ($1, $2, 'assistant', $3, $4, $5) RETURNING *
            """,
            case_id, user_id, answer, body.thread_type, body.related_scene_id,
        )

    return EchoChatResponse(
        user_message=_row_to_msg(user_msg_row),
        assistant_message=_row_to_msg(assistant_msg_row),
    )


@router.get("/history", response_model=list[EchoMessageResponse])
async def get_history(
    case_id: UUID,
    thread_type: str = "topic",
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[EchoMessageResponse]:
    """Gesprächsverlauf eines Threads abrufen."""
    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2",
            case_id, current_user["user_id"],
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        rows = await conn.fetch(
            "SELECT * FROM echo_messages WHERE case_id = $1 AND thread_type = $2 "
            "ORDER BY created_at ASC LIMIT $3",
            case_id, thread_type, limit,
        )
    return [_row_to_msg(r) for r in rows]


def _row_to_msg(row) -> EchoMessageResponse:
    import json
    d = dict(row)
    meta = d.get("metadata")
    if isinstance(meta, str):
        d["metadata"] = json.loads(meta)
    elif meta is None:
        d["metadata"] = {}
    return EchoMessageResponse(**d)

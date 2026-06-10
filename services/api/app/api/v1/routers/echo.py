"""Router: Echo-Chat — /api/v1/cases/{case_id}/echo"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

import json as _json

from app.core.dependencies import get_current_user, get_pool
from app.schemas.echo import EchoChatRequest, EchoChatResponse, EchoMessageResponse
from app.services.echo_service import build_case_context
from app.services.profile_service import build_profile_context
from app.services.person_profile_service import build_person_context

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
        person_profile_row = await conn.fetchrow(
            "SELECT * FROM person_profiles WHERE case_id = $1", case_id
        )

        # Letzte 20 Nachrichten als Gesprächshistorie
        if body.thread_type == "scene" and body.scene_session_id:
            history_rows = await conn.fetch(
                "SELECT role, content FROM echo_messages "
                "WHERE case_id = $1 AND thread_type = 'scene' "
                "AND metadata->>'scene_session_id' = $2 "
                "ORDER BY created_at DESC LIMIT 20",
                case_id, body.scene_session_id,
            )
        else:
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

    session_meta = _json.dumps({"scene_session_id": body.scene_session_id}) if body.scene_session_id else "{}"

    # ── Sonderfall: Beziehungskontext hinzufügen ──────────────────────────────
    if body.message == "__add_context__" and body.thread_type == "scene" and body.scene_session_id:
        # Profil laden
        profile_row = None
        async with pool.acquire() as conn:
            profile_row = await conn.fetchrow(
                "SELECT * FROM user_profiles WHERE user_id = $1", user_id
            )

        # Kontext-String aufbauen
        context_text = build_case_context(
            case=case_context,
            onboarding=onboarding,
            scenes=scenes,
            scale_scores=scale_scores,
        )
        if profile_row:
            profile_modules = profile_row.get("modules") or {}
            if isinstance(profile_modules, str):
                import json as _pj
                profile_modules = _pj.loads(profile_modules)
            context_text += "\n\n" + build_profile_context({
                "modules": profile_modules,
                "safety_status": profile_row.get("safety_status", "no_indication"),
            })

        context_meta = _json.dumps({
            "scene_session_id": body.scene_session_id,
            "context_marker": True,
        })

        # Kontext als System-Nachricht persistent speichern
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, metadata)
                VALUES ($1, $2, 'system', $3, 'scene', $4::jsonb)
                """,
                case_id, user_id, context_text, context_meta,
            )

        # Echo bestätigt den Kontext
        answer = await echo_svc.scene_confirm_context(context_text=context_text)

        async with pool.acquire() as conn:
            user_msg_row = await conn.fetchrow(
                """
                INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, metadata)
                VALUES ($1, $2, 'user', '__add_context__', 'scene', $3::jsonb) RETURNING *
                """,
                case_id, user_id, session_meta,
            )
            assistant_msg_row = await conn.fetchrow(
                """
                INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, metadata)
                VALUES ($1, $2, 'assistant', $3, 'scene', $4::jsonb) RETURNING *
                """,
                case_id, user_id, answer, session_meta,
            )

        return EchoChatResponse(
            user_message=_row_to_msg(user_msg_row),
            assistant_message=_row_to_msg(assistant_msg_row),
        )

    # ── Normaler Chat: gespeicherten Kontext aus der Session laden ────────────
    extra_context = ""
    # Personenprofil-Kontext für Nicht-Szenen-Threads einbinden
    if body.thread_type != "scene" and person_profile_row:
        pp_data = dict(person_profile_row)
        pp_modules = pp_data.get("modules") or {}
        if isinstance(pp_modules, str):
            import json as _ppj
            pp_modules = _ppj.loads(pp_modules)
        pp_summary = pp_data.get("summary") or {}
        if isinstance(pp_summary, str):
            import json as _ppj2
            pp_summary = _ppj2.loads(pp_summary)
        if pp_modules:
            extra_context = build_person_context({"modules": pp_modules, "summary": pp_summary})

    if body.thread_type == "scene" and body.scene_session_id:
        async with pool.acquire() as conn:
            ctx_row = await conn.fetchrow(
                "SELECT content FROM echo_messages "
                "WHERE case_id = $1 AND thread_type = 'scene' "
                "AND metadata->>'scene_session_id' = $2 "
                "AND metadata->>'context_marker' = 'true' "
                "ORDER BY created_at ASC LIMIT 1",
                case_id, body.scene_session_id,
            )
        if ctx_row:
            extra_context = ctx_row["content"]

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
        extra_context=extra_context,
    )

    async with pool.acquire() as conn:
        user_msg_row = await conn.fetchrow(
            """
            INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, related_scene_id, metadata)
            VALUES ($1, $2, 'user', $3, $4, $5, $6::jsonb) RETURNING *
            """,
            case_id, user_id, body.message, body.thread_type, body.related_scene_id, session_meta,
        )
        assistant_msg_row = await conn.fetchrow(
            """
            INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, related_scene_id, metadata)
            VALUES ($1, $2, 'assistant', $3, $4, $5, $6::jsonb) RETURNING *
            """,
            case_id, user_id, answer, body.thread_type, body.related_scene_id, session_meta,
        )

    return EchoChatResponse(
        user_message=_row_to_msg(user_msg_row),
        assistant_message=_row_to_msg(assistant_msg_row),
    )


class FinalizeSceneRequest(BaseModel):
    session_id: str


@router.post("/finalize-scene")
async def finalize_scene(
    case_id: UUID,
    body: FinalizeSceneRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Liest den Szenen-Thread, extrahiert eine Szene per KI und speichert sie."""
    user_id = current_user["user_id"]
    echo_svc = _get_echo_service(request)

    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT * FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        history_rows = await conn.fetch(
            "SELECT role, content FROM echo_messages "
            "WHERE case_id = $1 AND thread_type = 'scene' "
            "AND metadata->>'scene_session_id' = $2 "
            "ORDER BY created_at ASC",
            case_id, body.session_id,
        )

    if not history_rows:
        raise HTTPException(status_code=400, detail="Keine Szenen-Unterhaltung gefunden.")

    history = [{"role": r["role"], "content": r["content"]} for r in history_rows]

    extracted = await echo_svc.extract_scene_from_conversation(
        history=history,
        case_context=dict(case_row),
    )

    title = extracted.get("title") or "Szene aus Echo-Gespräch"
    description = extracted.get("description") or ""
    user_reaction = extracted.get("user_reaction")
    distress_score = extracted.get("distress_score")
    safety_level = extracted.get("safety_level", "none")
    pattern_tags = extracted.get("pattern_tags") or []
    scene_date = extracted.get("scene_date")

    import json as _json
    async with pool.acquire() as conn:
        scene_row = await conn.fetchrow(
            """
            INSERT INTO scenes
              (case_id, user_id, title, description, user_reaction,
               scene_date, distress_score, safety_level, pattern_tags, input_mode)
            VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8,$9::jsonb,'chat')
            RETURNING *
            """,
            case_id, user_id, title[:200], description, user_reaction,
            scene_date, distress_score, safety_level, _json.dumps(pattern_tags),
        )

    return {
        "scene_id": str(scene_row["id"]),
        "title": scene_row["title"],
        "_extraction_meta": {
            "confidence": extracted.get("_confidence"),
            "note": extracted.get("_note"),
        },
    }


@router.get("/history", response_model=list[EchoMessageResponse])
async def get_history(
    case_id: UUID,
    thread_type: str = "topic",
    session_id: str | None = Query(default=None),
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

        if thread_type == "scene" and session_id:
            rows = await conn.fetch(
                "SELECT * FROM echo_messages WHERE case_id = $1 AND thread_type = $2 "
                "AND metadata->>'scene_session_id' = $3 "
                "ORDER BY created_at ASC LIMIT $4",
                case_id, thread_type, session_id, limit,
            )
        else:
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

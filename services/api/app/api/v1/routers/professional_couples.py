"""Router: Paar-Analyse — koppelt zwei freigegebene Fälle + Paar-Echo.

SICHERHEIT: Eine Kopplung gewährt KEINEN neuen Datenzugriff. Koppeln verlangt aktive
Freigabe BEIDER Fälle (couple_service.create_couple → require_active_share ×2); das
Paar-Echo lädt jeden Fall einzeln über load_shared_bundle (404 bei Widerruf). Die
Paar-Echo-Daten liegen in eigenen professional_couple_echo_*-Tabellen.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core import crypto
from app.core.dependencies import get_current_professional, get_pool
from app.schemas.professional import (
    CaseCoupleStatus,
    CoupleCreateRequest,
    CoupleEchoChatRequest,
    CoupleEchoChatResponse,
    CoupleEchoMessageResponse,
    CoupleEchoSessionResponse,
    CoupleGlossaryTerm,
    CoupleMeta,
    CoupleResponse,
)
from app.services import couple_service, echo_modes
from app.services.sharing_service import require_active_share
from app.services.subscription_service import enforce_professional_echo_limit

router = APIRouter(prefix="/professional", tags=["professional-couples"])


def _get_echo_service(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


def _msg_response(row) -> CoupleEchoMessageResponse:
    return CoupleEchoMessageResponse(
        id=row["id"], session_id=row["session_id"], role=row["role"],
        content=crypto.decrypt(row["content"]), thread_type=row["thread_type"],
        glossary_slug=row["glossary_slug"], created_at=row["created_at"],
    )


# ── Kopplung verwalten ───────────────────────────────────────────────────────

@router.post("/couples", response_model=CoupleResponse)
async def create_couple(
    body: CoupleCreateRequest,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> CoupleResponse:
    """Koppelt zwei Fälle. Beide müssen aktiv an diese Fachperson freigegeben sein."""
    pid = current["user_id"]
    async with pool.acquire() as conn:
        couple = await couple_service.create_couple(pid, body.case_id_a, body.case_id_b, conn)
    return CoupleResponse(**{
        k: couple[k] for k in ("id", "case_id_a", "case_id_b", "is_demo", "created_at")
    })


@router.delete("/couples/{couple_id}")
async def delete_couple(
    couple_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        ok = await couple_service.delete_couple(pid, couple_id, conn)
    if not ok:
        raise HTTPException(status_code=404, detail="Kopplung nicht gefunden.")
    return {"deleted": True}


@router.get("/couples/meta", response_model=CoupleMeta)
async def couple_meta(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> CoupleMeta:
    """Vorschlagsfragen + Paar-Glossar für die Paar-Echo-Seite."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT slug, term, definition FROM glossary_terms "
            "WHERE slug LIKE $1 ORDER BY sort_order",
            couple_service.COUPLE_GLOSSARY_PREFIX + "%",
        )
    return CoupleMeta(
        suggested_questions=couple_service.COUPLE_SUGGESTED_QUESTIONS,
        glossary=[CoupleGlossaryTerm(**dict(r)) for r in rows],
    )


@router.get("/cases/{case_id}/couple", response_model=CaseCoupleStatus)
async def case_couple_status(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> CaseCoupleStatus:
    """Ist dieser Fall gekoppelt? (für den Hinweis auf der Fallinformationen-Karte)"""
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)   # 404, wenn Fall nicht freigegeben
        partner = await couple_service.get_partner_case(pid, case_id, conn)
    if not partner:
        return CaseCoupleStatus(coupled=False)
    return CaseCoupleStatus(
        coupled=True, couple_id=partner["couple_id"], partner_case_id=partner["partner_case_id"],
    )


# ── Paar-Echo ────────────────────────────────────────────────────────────────

@router.post("/couples/{couple_id}/echo/chat", response_model=CoupleEchoChatResponse)
async def couple_echo_chat(
    couple_id: UUID,
    body: CoupleEchoChatRequest,
    request: Request,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> CoupleEchoChatResponse:
    pid = current["user_id"]
    echo_svc = _get_echo_service(request)

    async with pool.acquire() as conn:
        await enforce_professional_echo_limit(pid, conn)
        couple = await couple_service.require_couple(pid, couple_id, conn)
        # Sicherheits-Gates: beide Fälle workable (Demo frei); Freigaben werden im Loader geprüft.
        await couple_service.assert_couple_workable(couple, current, conn)
        combined_context = await couple_service.load_combined_context(pid, couple, conn)

        if body.session_id:
            session = await conn.fetchrow(
                "SELECT id FROM professional_couple_echo_sessions "
                "WHERE id = $1 AND professional_user_id = $2 AND couple_id = $3",
                body.session_id, pid, couple_id,
            )
            if not session:
                raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
            session_id = session["id"]
        else:
            session = await conn.fetchrow(
                "INSERT INTO professional_couple_echo_sessions (couple_id, professional_user_id) "
                "VALUES ($1, $2) RETURNING id",
                couple_id, pid,
            )
            session_id = session["id"]

        history_rows = await conn.fetch(
            "SELECT role, content FROM professional_couple_echo_messages "
            "WHERE session_id = $1 ORDER BY created_at DESC LIMIT 20",
            session_id,
        )
        pro_settings = await conn.fetchrow(
            "SELECT echo_approach, echo_tone, echo_depth, echo_custom_steering "
            "FROM professional_profiles WHERE user_id = $1", pid,
        )

    history = [
        {"role": r["role"], "content": crypto.decrypt(r["content"])}
        for r in reversed(history_rows)
    ]
    pro_mode_steering = echo_modes.build_pro_steering(
        pro_settings["echo_approach"] if pro_settings else None,
        pro_settings["echo_tone"] if pro_settings else None,
        pro_settings["echo_depth"] if pro_settings else None,
        crypto.decrypt(pro_settings["echo_custom_steering"]) if pro_settings else None,
    )

    glossary_term = glossary_definition = None
    if body.thread_type == "glossary" and body.glossary_slug:
        async with pool.acquire() as conn:
            g = await conn.fetchrow(
                "SELECT term, definition FROM glossary_terms WHERE slug = $1",
                body.glossary_slug,
            )
        if g:
            glossary_term, glossary_definition = g["term"], g["definition"]

    answer = await echo_svc.professional_chat(
        user_message=body.message,
        shared_context=combined_context,
        history=history,
        glossary_term=glossary_term,
        glossary_definition=glossary_definition,
        mode_steering=pro_mode_steering,
        prompt_file="echo_couple_prompt.md",
    )

    async with pool.acquire() as conn:
        user_msg = await conn.fetchrow(
            "INSERT INTO professional_couple_echo_messages "
            "(session_id, couple_id, professional_user_id, role, content, thread_type, glossary_slug) "
            "VALUES ($1, $2, $3, 'user', $4, $5, $6) RETURNING *",
            session_id, couple_id, pid, crypto.encrypt(body.message),
            body.thread_type, body.glossary_slug,
        )
        assistant_msg = await conn.fetchrow(
            "INSERT INTO professional_couple_echo_messages "
            "(session_id, couple_id, professional_user_id, role, content, thread_type, glossary_slug) "
            "VALUES ($1, $2, $3, 'assistant', $4, $5, $6) RETURNING *",
            session_id, couple_id, pid, crypto.encrypt(answer),
            body.thread_type, body.glossary_slug,
        )
        await conn.execute(
            "UPDATE professional_couple_echo_sessions SET updated_at = NOW(), "
            "title = COALESCE(title, LEFT($2, 60)) WHERE id = $1",
            session_id, body.message.strip(),
        )

    return CoupleEchoChatResponse(
        user_message=_msg_response(user_msg),
        assistant_message=_msg_response(assistant_msg),
        session_id=session_id,
    )


@router.get("/couples/{couple_id}/echo/sessions", response_model=list[CoupleEchoSessionResponse])
async def list_couple_sessions(
    couple_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[CoupleEchoSessionResponse]:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await couple_service.require_couple(pid, couple_id, conn)
        rows = await conn.fetch(
            "SELECT id, couple_id, title, created_at, updated_at "
            "FROM professional_couple_echo_sessions "
            "WHERE professional_user_id = $1 AND couple_id = $2 ORDER BY updated_at DESC",
            pid, couple_id,
        )
    return [CoupleEchoSessionResponse(**dict(r)) for r in rows]


@router.get("/couples/{couple_id}/echo/history", response_model=list[CoupleEchoMessageResponse])
async def couple_history(
    couple_id: UUID,
    session_id: UUID = Query(...),
    limit: int = 50,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[CoupleEchoMessageResponse]:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await couple_service.require_couple(pid, couple_id, conn)
        owns = await conn.fetchrow(
            "SELECT id FROM professional_couple_echo_sessions "
            "WHERE id = $1 AND professional_user_id = $2 AND couple_id = $3",
            session_id, pid, couple_id,
        )
        if not owns:
            raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
        rows = await conn.fetch(
            "SELECT * FROM professional_couple_echo_messages WHERE session_id = $1 "
            "ORDER BY created_at ASC LIMIT $2",
            session_id, limit,
        )
    return [_msg_response(r) for r in rows]


@router.delete("/couples/{couple_id}/echo/sessions/{session_id}")
async def delete_couple_session(
    couple_id: UUID,
    session_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await couple_service.require_couple(pid, couple_id, conn)
        result = await conn.execute(
            "DELETE FROM professional_couple_echo_sessions "
            "WHERE id = $1 AND professional_user_id = $2 AND couple_id = $3",
            session_id, pid, couple_id,
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
    return {"deleted": True}

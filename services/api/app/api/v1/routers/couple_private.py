"""Router: privater, flankierender Echo-Dialog zur Paarsitzung.

  GET  /couple/sessions/{id}/private           – eigener privater Verlauf
  POST /couple/sessions/{id}/private           – schreiben, Echo antwortet
  POST /couple/sessions/{id}/private/feedback  – Selbst-Feedback zum bisherigen Gespräch

Sicherheit: Alles läuft über ``require_private_access`` (Mitglied im Paarraum, sonst 404) UND
ist zusätzlich auf die eigene ``user_id`` eingeschränkt. Es gibt keinen Endpunkt, der den
privaten Dialog der anderen Person herausgibt.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_private import (
    CouplePrivateMessageCreate,
    CouplePrivateThread,
)
from app.services import couple_private_service as cps
from app.services.subscription_service import enforce_echo_prompt_limit

router = APIRouter(prefix="/couple/sessions", tags=["couple-private"])

_PRIVATE_PROMPT = "echo_couple_private_prompt.md"


def _echo(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


@router.get("/{session_id}/private", response_model=CouplePrivateThread)
async def get_private(
    session_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CouplePrivateThread:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        await cps.require_private_access(conn, session_id, user_id)
        messages = await cps.load_private_messages(conn, session_id, user_id)
    return CouplePrivateThread(messages=[cps.public_private_message(m) for m in messages])


@router.post("/{session_id}/private", response_model=CouplePrivateThread)
async def post_private(
    session_id: UUID, body: CouplePrivateMessageCreate, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CouplePrivateThread:
    user_id = current["user_id"]
    echo_svc = _echo(request)
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        session, link = await cps.require_private_access(conn, session_id, user_id)

        await cps.add_private_message(conn, session_id, user_id, role="user", content=body.content)
        history = cps.build_private_history(
            await cps.load_private_messages(conn, session_id, user_id)
        )
        context = await cps.build_private_context(conn, session, link, user_id)

        reply = await echo_svc.professional_chat(
            user_message=body.content,
            shared_context=context,
            history=history[:-1],   # die eigene neue Nachricht steckt schon in user_message
            prompt_file=_PRIVATE_PROMPT,
        )
        await cps.add_private_message(conn, session_id, user_id, role="echo", content=reply)
        messages = await cps.load_private_messages(conn, session_id, user_id)
    return CouplePrivateThread(messages=[cps.public_private_message(m) for m in messages])


@router.post("/{session_id}/private/feedback", response_model=CouplePrivateThread)
async def private_feedback(
    session_id: UUID, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CouplePrivateThread:
    """Ehrliches Feedback zum EIGENEN Anteil am bisherigen Gespräch — nur für dich."""
    user_id = current["user_id"]
    echo_svc = _echo(request)
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        session, link = await cps.require_private_access(conn, session_id, user_id)

        transcript = await cps.load_transcript(conn, session, link)
        if not transcript:
            raise HTTPException(
                status_code=400,
                detail="Für ein Feedback braucht es erst ein Gespräch.",
            )
        names = await cps.load_member_names(conn, link)
        own_name = names.get(str(user_id), "Person")
        context = await cps.build_private_context(conn, session, link, user_id)

        reply = await echo_svc.professional_chat(
            user_message=(
                f"Bitte gib mir Feedback zu meinem eigenen Anteil an diesem Gespräch. "
                f"Ich bin '{own_name}'.\n\n"
                f"Gesprächsverlauf:\n{transcript}"
            ),
            shared_context=context,
            history=[],
            prompt_file=_PRIVATE_PROMPT,
        )
        await cps.add_private_message(
            conn, session_id, user_id, role="echo", content=reply, kind="feedback",
        )
        messages = await cps.load_private_messages(conn, session_id, user_id)
    return CouplePrivateThread(messages=[cps.public_private_message(m) for m in messages])

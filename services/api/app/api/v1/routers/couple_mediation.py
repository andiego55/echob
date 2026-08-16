"""Router: AI-Mediation im Paarraum (Caucus-Modell, Paartherapie Phase 5).

  GET/POST /couple/links/{couple_id}/topics      – Themen auflisten / anlegen
  GET      /couple/topics/{id}                   – Thema inkl. Perspektiven + Vorschlägen
  PUT      /couple/topics/{id}/perspective       – eigenen Beitrag speichern (offen/vertraulich)
  POST     /couple/topics/{id}/mediate           – Echo erarbeitet den Lösungsvorschlag
  POST     /couple/topics/{id}/status            – Thema als geklärt markieren

Vertraulichkeit: Antworten entstehen ausschließlich über ``public_perspective`` — der
vertrauliche Beitrag der jeweils anderen Person ist dort nicht enthalten (und es ist auch
nicht erkennbar, ob es einen gibt). Vertrauliches fließt nur in den Prompt.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_mediation import (
    CoupleMediation,
    CouplePerspectiveSave,
    CoupleTopic,
    CoupleTopicCreate,
    CoupleTopicDetail,
    CoupleTopicStatus,
)
from app.services import couple_mediation_service as cms
from app.services.couple_session_service import load_member_names
from app.services.subscription_service import enforce_echo_prompt_limit

router = APIRouter(prefix="/couple", tags=["couple-mediation"])

_MEDIATION_PROMPT = "echo_couple_mediation_prompt.md"


def _echo(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


async def _detail(conn, topic, link, user_id) -> CoupleTopicDetail:
    names = await load_member_names(conn, link)
    perspectives = await cms.load_perspectives(conn, topic["id"])
    mediations = await cms.list_mediations(conn, topic["id"])
    return CoupleTopicDetail(
        topic=CoupleTopic(**topic),
        perspectives=[cms.public_perspective(p, user_id, names) for p in perspectives],
        mediations=[CoupleMediation(**m) for m in mediations],
        both_sides_ready=cms.both_sides_ready(perspectives, link),
    )


@router.get("/links/{couple_id}/topics", response_model=list[CoupleTopic])
async def list_topics(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> list[CoupleTopic]:
    async with pool.acquire() as conn:
        rows = await cms.list_topics(conn, couple_id, current["user_id"])
    return [CoupleTopic(**r) for r in rows]


@router.post("/links/{couple_id}/topics", response_model=CoupleTopic, status_code=201)
async def create_topic(
    couple_id: UUID, body: CoupleTopicCreate,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTopic:
    async with pool.acquire() as conn:
        row = await cms.create_topic(
            conn, couple_id, current["user_id"], title=body.title, description=body.description,
        )
    return CoupleTopic(**row)


@router.get("/topics/{topic_id}", response_model=CoupleTopicDetail)
async def get_topic(
    topic_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTopicDetail:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        topic, link = await cms.require_topic(conn, topic_id, user_id)
        return await _detail(conn, topic, link, user_id)


@router.put("/topics/{topic_id}/perspective", response_model=CoupleTopicDetail)
async def save_perspective(
    topic_id: UUID, body: CouplePerspectiveSave,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTopicDetail:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        await cms.save_perspective(
            conn, topic_id, user_id,
            open_text=body.open_text, private_text=body.private_text,
        )
        topic, link = await cms.require_topic(conn, topic_id, user_id)
        return await _detail(conn, topic, link, user_id)


@router.post("/topics/{topic_id}/mediate", response_model=CoupleTopicDetail)
async def mediate(
    topic_id: UUID, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTopicDetail:
    """Erarbeitet den Lösungsvorschlag. Beide Seiten müssen offen etwas gesagt haben."""
    user_id = current["user_id"]
    echo_svc = _echo(request)
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        topic, link = await cms.require_topic(conn, topic_id, user_id)
        perspectives = await cms.load_perspectives(conn, topic_id)
        if not cms.both_sides_ready(perspectives, link):
            raise HTTPException(
                status_code=400,
                detail="Erst wenn ihr beide eure offene Sicht geschrieben habt.",
            )

        context = await cms.build_mediation_input(conn, topic, link, perspectives)
        body = await echo_svc.professional_chat(
            user_message=(
                "Erarbeite jetzt den Mediationsvorschlag nach den vorgegebenen Abschnitten. "
                "Denk an die eiserne Regel zu den vertraulichen Beiträgen."
            ),
            shared_context=context,
            history=[],
            prompt_file=_MEDIATION_PROMPT,
        )
        await cms.save_mediation(conn, topic_id, user_id, body)
        return await _detail(conn, topic, link, user_id)


@router.post("/topics/{topic_id}/status", response_model=CoupleTopic)
async def set_status(
    topic_id: UUID, body: CoupleTopicStatus,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTopic:
    async with pool.acquire() as conn:
        row = await cms.set_topic_status(conn, topic_id, current["user_id"], body.status)
    return CoupleTopic(**row)

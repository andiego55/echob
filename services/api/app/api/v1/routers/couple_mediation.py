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
    CoupleSessionFromTopic,
    CoupleShareDraft,
    CoupleTopic,
    CoupleTopicCreate,
    CoupleTopicDetail,
    CoupleTopicStatus,
)
from app.schemas.couple_private import CouplePrivateMessageCreate, CouplePrivateThread
from app.services import couple_mediation_service as cms
from app.services import couple_private_service as cps
from app.services import couple_progress_service as progress
from app.services.couple_session_service import load_member_names
from app.services.subscription_service import enforce_echo_prompt_limit

router = APIRouter(prefix="/couple", tags=["couple-mediation"])

_MEDIATION_PROMPT = "echo_couple_mediation_prompt.md"
# Der Nachgang zur Mediation laeuft im privaten Begleit-Modus.
_PRIVATE_PROMPT = "echo_couple_private_prompt.md"


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
        if body.open_text:
            await progress.award(conn, topic["couple_id"], user_id,
                                 "perspective_shared", topic_id)
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
        await progress.award(conn, topic["couple_id"], user_id, "mediation_done", topic_id)
        return await _detail(conn, topic, link, user_id)


# ── Wie weiter? Drei Wege aus dem Vorschlag heraus ───────────────────────────

@router.get("/topics/{topic_id}/private", response_model=CouplePrivateThread)
async def get_topic_private(
    topic_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CouplePrivateThread:
    """Dein privater Dialog über dieses Thema. Die andere Person sieht ihn nie."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        await cms.require_topic(conn, topic_id, user_id)
        msgs = await cps.load_topic_private_messages(conn, topic_id, user_id)
    return CouplePrivateThread(messages=[cps.public_private_message(m) for m in msgs])


@router.post("/topics/{topic_id}/private", response_model=CouplePrivateThread)
async def post_topic_private(
    topic_id: UUID, body: CouplePrivateMessageCreate, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CouplePrivateThread:
    """Den Vorschlag erst einmal für dich sortieren — mit deinem eigenen Zusammenhang."""
    user_id = current["user_id"]
    echo_svc = _echo(request)
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        topic, link = await cms.require_topic(conn, topic_id, user_id)

        await cps.add_topic_private_message(conn, topic_id, user_id, role="user",
                                            content=body.content)
        history = cps.build_private_history(
            await cps.load_topic_private_messages(conn, topic_id, user_id)
        )
        context = await cps.build_topic_private_context(conn, topic, link, user_id)
        reply = await echo_svc.professional_chat(
            user_message=body.content, shared_context=context,
            history=history[:-1], prompt_file=_PRIVATE_PROMPT,
        )
        await cps.add_topic_private_message(conn, topic_id, user_id, role="echo", content=reply)
        msgs = await cps.load_topic_private_messages(conn, topic_id, user_id)
    return CouplePrivateThread(messages=[cps.public_private_message(m) for m in msgs])


@router.post("/topics/{topic_id}/private/summary", response_model=CoupleShareDraft)
async def summarize_topic_private(
    topic_id: UUID, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleShareDraft:
    """Fasst deinen privaten Dialog zu einem Text zusammen, den du teilen KÖNNTEST.

    Der Entwurf wird nicht gespeichert und geht nirgendwohin — erst dein ausdrückliches
    Teilen macht daraus etwas, das die andere Person sieht.
    """
    user_id = current["user_id"]
    echo_svc = _echo(request)
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        topic, _ = await cms.require_topic(conn, topic_id, user_id)
        msgs = await cps.load_topic_private_messages(conn, topic_id, user_id)
        if not msgs:
            raise HTTPException(
                status_code=400, detail="Sprich erst mit Echo, dann gibt es etwas zusammenzufassen.",
            )
        verlauf = "\n".join(
            f"{'Echo' if m['role'] == 'echo' else 'Ich'}: {m['content']}" for m in msgs
        )
        draft = await echo_svc.professional_chat(
            user_message=(
                f"Thema: {topic['title']}\n\nMein privater Verlauf mit dir:\n{verlauf}\n\n"
                "Fasse daraus in höchstens 150 Wörtern zusammen, was ich meiner Partnerperson "
                "sagen möchte — in Ich-Botschaften, ohne Vorwürfe und ohne etwas aus diesem "
                "Dialog preiszugeben, das ich für mich behalten will. Nur der Text, keine "
                "Einleitung."
            ),
            shared_context="", history=[], prompt_file=_PRIVATE_PROMPT,
        )
    return CoupleShareDraft(text=draft)


@router.post("/topics/{topic_id}/share", response_model=CoupleTopicDetail)
async def share_to_topic(
    topic_id: UUID, body: CoupleShareDraft,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTopicDetail:
    """Hängt deinen Text an deine OFFENE Sicht an — ab jetzt sieht die andere Person ihn."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        topic, link = await cms.require_topic(conn, topic_id, user_id)
        perspectives = await cms.load_perspectives(conn, topic_id)
        own = next((p for p in perspectives if str(p["user_id"]) == str(user_id)), None)
        bisher = (own or {}).get("open_text") or ""
        neu = (bisher + "\n\n" + body.text.strip()).strip() if bisher else body.text.strip()
        await cms.save_perspective(conn, topic_id, user_id, open_text=neu)
        return await _detail(conn, topic, link, user_id)


@router.post("/topics/{topic_id}/session", response_model=CoupleSessionFromTopic, status_code=201)
async def session_from_topic(
    topic_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleSessionFromTopic:
    """Macht aus dem Thema ein moderiertes Gespräch — mit dem Vorschlag auf dem Tisch."""
    from app.services import couple_session_service as css

    user_id = current["user_id"]
    async with pool.acquire() as conn:
        topic, _ = await cms.require_topic(conn, topic_id, user_id)
        vorhanden = await conn.fetchval(
            "SELECT id FROM couple_sessions WHERE topic_id = $1 ORDER BY created_at LIMIT 1",
            topic_id,
        )
        if vorhanden:
            return CoupleSessionFromTopic(session_id=vorhanden, created=False)

        session = await css.create_session(
            conn, topic["couple_id"], user_id,
            title=topic["title"],
            topic=topic.get("description"),
            goal="Aus Echos Vorschlag etwas machen, das für uns beide trägt.",
        )
        await conn.execute(
            "UPDATE couple_sessions SET topic_id = $2 WHERE id = $1", session["id"], topic_id,
        )
    return CoupleSessionFromTopic(session_id=session["id"], created=True)


@router.post("/topics/{topic_id}/status", response_model=CoupleTopic)
async def set_status(
    topic_id: UUID, body: CoupleTopicStatus,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTopic:
    async with pool.acquire() as conn:
        row = await cms.set_topic_status(conn, topic_id, current["user_id"], body.status)
    return CoupleTopic(**row)

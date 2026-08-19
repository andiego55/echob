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
from app.core.logging import get_logger
from app.schemas.couple_mediation import (
    CoupleBridge,
    CoupleBridgeDrop,
    CoupleBridgeUpdate,
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
from app.services import couple_agreement_service as cas
from app.services import couple_mediation_service as cms
from app.services import couple_notify_service as notify
from app.services import couple_private_service as cps
from app.services import couple_progress_service as progress
from app.services.couple_session_service import load_member_names
from app.services.subscription_service import enforce_echo_prompt_limit

router = APIRouter(prefix="/couple", tags=["couple-mediation"])
logger = get_logger(__name__)

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
    bridges = await cms.list_bridges(conn, topic["id"])
    verlauf = await cms.load_bridge_versions(conn, [b["id"] for b in bridges])
    for b in bridges:
        b["versions"] = verlauf.get(str(b["id"]), [])
    messages = await cms.load_topic_messages(conn, topic["id"])
    return CoupleTopicDetail(
        topic=CoupleTopic(**topic),
        perspectives=[cms.public_perspective(p, user_id, names) for p in perspectives],
        mediations=[CoupleMediation(**m) for m in mediations],
        both_sides_ready=cms.both_sides_ready(perspectives, link),
        bridges=[CoupleBridge(**b) for b in bridges],
        messages=[
            {
                "id": m["id"], "role": m["role"], "user_id": m["user_id"],
                "speaker": "Echo" if m["role"] == "echo"
                           else names.get(str(m["user_id"]), "Person"),
                "content": m["content"], "created_at": m["created_at"],
            }
            for m in messages
        ],
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
            await notify.to_partner(conn, topic["couple_id"], user_id,
                                    notify.perspective_shared(topic["title"]))
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

        # Aus dem Fliesstext werden verhandelbare Brücken. Ein eigener, kleiner Aufruf —
        # so bleibt der Vorschlag gut lesbar UND maschinell greifbar.
        try:
            raw = await echo_svc.professional_chat(
                user_message=cms.BRIDGE_EXTRACT_INSTRUCTION + body,
                shared_context="", history=[], prompt_file=_MEDIATION_PROMPT,
            )
            await cms.save_bridges(conn, topic_id, cms.parse_bridges(raw))
        except Exception:  # noqa: BLE001 - ohne Brücken bleibt der Vorschlag trotzdem nutzbar
            logger.warning("Brücken konnten nicht extrahiert werden (topic=%s).",
                           str(topic_id)[:8])

        await progress.award(conn, topic["couple_id"], user_id, "mediation_done", topic_id)
        return await _detail(conn, topic, link, user_id)


# ── Brücken verhandeln ───────────────────────────────────────────────────────

@router.patch("/bridges/{bridge_id}", response_model=CoupleTopicDetail)
async def update_bridge(
    bridge_id: UUID, body: CoupleBridgeUpdate,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTopicDetail:
    """Ändern heißt Gegenvorschlag — die andere Person sieht, dass du daran warst."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        await cms.update_bridge(conn, bridge_id, user_id, title=body.title, body=body.body)
        _, topic, link = await cms.require_bridge(conn, bridge_id, user_id)
        await notify.to_partner(conn, topic["couple_id"], user_id,
                                notify.bridge_changed(topic["title"]))
        return await _detail(conn, topic, link, user_id)


@router.post("/bridges/{bridge_id}/accept", response_model=CoupleTopicDetail)
async def accept_bridge(
    bridge_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTopicDetail:
    """Übernimmt die Brücke als Abmachung — die andere Person bestätigt sie wie immer."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        bridge, topic, link = await cms.require_bridge(conn, bridge_id, user_id)
        if bridge["status"] == "accepted":
            return await _detail(conn, topic, link, user_id)

        text = f"{bridge['title']}: {bridge['body']}" if bridge.get("title") else bridge["body"]
        agreement = await cas.propose(
            conn, topic["couple_id"], user_id, body=text[:1000], topic_id=topic["id"],
        )
        await cms.set_bridge_status(conn, bridge_id, user_id, "accepted",
                                    agreement_id=agreement["id"])
        await progress.award(conn, topic["couple_id"], user_id,
                             "agreement_proposed", agreement["id"])
        await notify.to_partner(conn, topic["couple_id"], user_id,
                                notify.agreement_proposed(text))
        return await _detail(conn, topic, link, user_id)


@router.post("/bridges/{bridge_id}/drop", response_model=CoupleTopicDetail)
async def drop_bridge(
    bridge_id: UUID, body: CoupleBridgeDrop,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTopicDetail:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        _, topic, link = await cms.require_bridge(conn, bridge_id, user_id)
        await cms.set_bridge_status(conn, bridge_id, user_id, "dropped", note=body.note)
        return await _detail(conn, topic, link, user_id)


# ── Gemeinsamer Diskussionsfaden ─────────────────────────────────────────────

@router.post("/topics/{topic_id}/messages", response_model=CoupleTopicDetail)
async def post_topic_message(
    topic_id: UUID, body: CouplePrivateMessageCreate, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTopicDetail:
    """Diskussion am Thema. »Echo, …« holt die Moderation dazu — wie in der Sitzung."""
    from app.services import couple_session_service as css

    user_id = current["user_id"]
    async with pool.acquire() as conn:
        topic, link = await cms.require_topic(conn, topic_id, user_id)
        await cms.add_topic_message(conn, topic_id, user_id=user_id, role="partner",
                                    content=body.content)

        if css.addresses_echo(body.content):
            await enforce_echo_prompt_limit(user_id, conn)
            await _topic_echo_turn(conn, _echo(request), topic, link, user_id)
        return await _detail(conn, topic, link, user_id)


@router.post("/topics/{topic_id}/messages/echo", response_model=CoupleTopicDetail)
async def call_echo_into_topic(
    topic_id: UUID, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTopicDetail:
    """Echo ausdrücklich in die Diskussion holen (Knopf)."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        topic, link = await cms.require_topic(conn, topic_id, user_id)
        await _topic_echo_turn(conn, _echo(request), topic, link, user_id)
        return await _detail(conn, topic, link, user_id)


async def _topic_echo_turn(conn, echo_svc, topic, link, user_id) -> None:
    """Echos Beitrag zur Diskussion — kennt Brücken, offene Sichten und den Verlauf.

    Vertrauliche Beiträge fließen hier bewusst NICHT ein: dieser Faden ist gemeinsam,
    und was Echo hier schreibt, lesen beide.
    """
    names = await load_member_names(conn, link)
    perspectives = await cms.load_perspectives(conn, topic["id"])
    bridges = await cms.list_bridges(conn, topic["id"])
    messages = await cms.load_topic_messages(conn, topic["id"])

    teile = [f"# Thema: {topic['title']}"]
    for p in perspectives:
        if (p.get("open_text") or "").strip():
            teile.append(f"## Offene Sicht von {names.get(str(p['user_id']), 'Person')}\n"
                         f"{p['open_text']}")
    if bridges:
        teile.append("## Stand der Vorschläge\n" + "\n".join(
            f"- [{b['status']}] {b.get('title') or ''}: {b['body']}" for b in bridges
        ))

    history = [
        {"role": "assistant" if m["role"] == "echo" else "user",
         "content": m["content"] if m["role"] == "echo"
                    else f"{names.get(str(m['user_id']), 'Person')}: {m['content']}"}
        for m in messages[-30:]
    ]
    reply = await echo_svc.professional_chat(
        user_message=(
            "Du wurdest in die Diskussion über die Vorschläge geholt. Antworte kurz und "
            "allparteilich. Wenn eine Alternative gefragt ist, formuliere genau EINEN "
            "konkreten Gegenvorschlag, der von beiden Seiten etwas verlangt. Gib das "
            "Gespräch danach an die beiden zurück."
        ),
        shared_context="\n\n".join(teile),
        history=history,
        prompt_file=_MEDIATION_PROMPT,
    )
    await cms.add_topic_message(conn, topic["id"], user_id=None, role="echo", content=reply)


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

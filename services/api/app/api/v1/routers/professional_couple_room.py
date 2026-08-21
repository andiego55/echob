"""Router: der Paarraum aus Sicht der Fachperson.

  GET  /professional/paarraeume                        - freigegebene Raeume
  GET  /professional/paarraeume/{couple_id}            - Ueberblick ohne Inhalt
  GET  /professional/paarraeume/{couple_id}/{element}  - ein freigegebenes Element
  POST /professional/klienten/{case_id}/paarraum-anfragen - um Zugang bitten

**Zur Anfrage.** Eine Fachperson darf bitten, aber nichts entscheiden - und sie darf
auch nicht ERFAHREN, ob ihre Klientin ueberhaupt in einem Paarraum ist. Das waere eine
Information ueber eine dritte Person, die nie zugestimmt hat. Deshalb antwortet die
Anfrage IMMER gleich, egal ob es einen Raum gibt oder nicht. Existiert einer, taucht die
Bitte dort auf und beide muessen zustimmen; existiert keiner, passiert schlicht nichts.

Jeder Lesepfad geht durch ``couple_professional_service.require_released``.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_professional import (
    CoupleRoomEchoReply,
    CoupleRoomEchoRequest,
    CoupleRoomOverview,
    CoupleRoomRequest,
    CoupleRoomSummary,
)
from app.services import couple_professional_service as cprof
from app.services import sharing_service
from app.services.subscription_service import enforce_echo_prompt_limit

router = APIRouter(prefix="/professional", tags=["professional-couple-room"])


@router.get("/paarraeume", response_model=list[CoupleRoomSummary])
async def list_rooms(
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> list[CoupleRoomSummary]:
    """Die Paarraeume, deren beide Mitglieder dieser Fachperson zugestimmt haben."""
    async with pool.acquire() as conn:
        rows = await cprof.list_for_professional(conn, current["user_id"])
    return [CoupleRoomSummary(**r) for r in rows]


@router.get("/paarraeume/{couple_id}", response_model=CoupleRoomOverview)
async def room_overview(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleRoomOverview:
    async with pool.acquire() as conn:
        data = await cprof.load_overview(conn, couple_id, current["user_id"])
    return CoupleRoomOverview(**data)


@router.get("/paarraeume/{couple_id}/{element}")
async def room_element(
    couple_id: UUID, element: str,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> Any:
    """Ein einzelnes freigegebenes Element. Nicht freigegeben = 404, nicht 403."""
    async with pool.acquire() as conn:
        return await cprof.load_released(conn, couple_id, current["user_id"], element)


@router.post("/klienten/{case_id}/paarraum-anfragen")
async def request_room(
    case_id: UUID, body: CoupleRoomRequest,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> dict[str, bool]:
    """Bittet um Zugang zum Paarraum dieser Klientin.

    Die Antwort ist absichtlich immer dieselbe. Wuerde sie verraten, ob ein Raum
    existiert, waere das eine Aussage ueber die Partnerperson - und die hat dieser
    Fachperson nichts erlaubt.
    """
    prof_id = current["user_id"]
    async with pool.acquire() as conn:
        share = await sharing_service.require_active_share(prof_id, case_id, conn)
        raeume = await conn.fetch(
            "SELECT id FROM couple_links WHERE status = 'active' "
            "AND (initiator_user_id = $1 OR partner_user_id = $1)",
            share["owner_user_id"],
        )
        for r in raeume:
            try:
                await cprof.request_by_professional(
                    conn, r["id"], prof_id,
                    elements=body.elements, message=body.message,
                )
            except Exception:  # noqa: BLE001
                # Gibt es schon eine Freigabe oder Bitte, bleibt es dabei. Auch das
                # darf nach aussen nicht sichtbar werden.
                continue
    return {"requested": True}


_ROOM_PROMPT = "echo_couple_room_prompt.md"


@router.post("/paarraeume/{couple_id}/echo", response_model=CoupleRoomEchoReply)
async def room_echo(
    couple_id: UUID, body: CoupleRoomEchoRequest, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleRoomEchoReply:
    """Echo ueber das freigegebene Raum-Material.

    **Bewusst nicht gespeichert.** Ein abgelegter Dialog wuerde altern und - schlimmer -
    einen Widerruf ueberleben: Das Paar beendet die Freigabe, und der Wortlaut laege
    weiter bei der Fachperson. Der Verlauf bleibt deshalb im Browser und wird bei jeder
    Frage mitgeschickt. Was die Fachperson behalten will, gehoert in ihre eigenen Notizen -
    eine bewusste Handlung, keine Nebenwirkung.
    """
    prof_id = current["user_id"]
    svc = getattr(request.app.state, "echo_service", None)
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")

    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(prof_id, conn)
        kontext = await cprof.build_room_context(conn, couple_id, prof_id)

    antwort = await svc.professional_chat(
        user_message=body.message,
        shared_context=kontext,
        history=[{"role": h.role, "content": h.content} for h in body.history][-20:],
        prompt_file=_ROOM_PROMPT,
    )
    return CoupleRoomEchoReply(reply=antwort)

"""Router: Impulse im Paarraum (Paartherapie).

  GET  /couple/links/{couple_id}/impulse            - Katalog mit Stand + Vorschlag
  GET  /couple/links/{couple_id}/impulse/{slug}     - ein Impuls
  PUT  /couple/links/{couple_id}/impulse/{slug}     - eigene Antwort speichern

Sicherheit: alles ueber ``require_couple_member`` im Service (404 fuer Fremde). Kein
Zugriff auf Fall-Daten, kein Echo-Aufruf - ein Impuls ist bewusst unmoderiert.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_impulse import (
    CoupleImpulse,
    CoupleImpulseAnswer,
    CoupleImpulseOverview,
)
from app.services import couple_impulse_service as cis
from app.services import couple_notify_service as notify
from app.services import couple_progress_service as progress

router = APIRouter(prefix="/couple/links/{couple_id}", tags=["couple-impulses"])


@router.get("/impulse", response_model=CoupleImpulseOverview)
async def list_impulses(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleImpulseOverview:
    async with pool.acquire() as conn:
        data = await cis.load_overview(conn, couple_id, current["user_id"])
    return CoupleImpulseOverview(**data)


@router.get("/impulse/{slug}", response_model=CoupleImpulse)
async def get_impulse(
    couple_id: UUID, slug: str, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleImpulse:
    async with pool.acquire() as conn:
        data = await cis.load_one(conn, couple_id, current["user_id"], slug)
    return CoupleImpulse(**data)


@router.put("/impulse/{slug}", response_model=CoupleImpulse)
async def answer_impulse(
    couple_id: UUID, slug: str, body: CoupleImpulseAnswer,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleImpulse:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        data = await cis.answer(conn, couple_id, user_id, slug, body.answer)
        await progress.award(conn, couple_id, user_id, "impulse_done", slug)
        # Nur solange die andere Person noch fehlt - sonst meldet man ihr, was sie
        # gerade selbst ausgeloest hat.
        if not data["both_done"]:
            await notify.to_partner(conn, couple_id, user_id, notify.impulse_answered())
    return CoupleImpulse(**data)

"""Router: woechentlicher Check-in im Paarraum (Paartherapie, Rhythmus).

  GET  /couple/links/{couple_id}/checkin          - Check-in der laufenden Woche
  PUT  /couple/links/{couple_id}/checkin          - eigene Antwort speichern
  GET  /couple/links/{couple_id}/checkin/history  - die letzten Wochen als Stimmungs-Zeitstrahl

Sicherheit: alles ueber ``require_couple_member`` im Service (404 fuer Fremde). Kein Zugriff
auf Fall-Daten, kein Echo-Aufruf - der Check-in ist bewusst ein reines Zwischen-euch-Ritual.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_checkin import (
    CoupleCheckinHistoryWeek,
    CoupleCheckinSave,
    CoupleCheckinWeek,
)
from app.services import couple_checkin_service as ccs
from app.services import couple_notify_service as notify
from app.services import couple_progress_service as progress

router = APIRouter(prefix="/couple/links/{couple_id}/checkin", tags=["couple-rhythm"])


@router.get("", response_model=CoupleCheckinWeek)
async def get_checkin(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleCheckinWeek:
    async with pool.acquire() as conn:
        return CoupleCheckinWeek(**await ccs.load_week(conn, couple_id, current["user_id"]))


@router.put("", response_model=CoupleCheckinWeek)
async def save_checkin(
    couple_id: UUID, body: CoupleCheckinSave,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleCheckinWeek:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        await ccs.save(
            conn, couple_id, user_id,
            mood=body.mood, highlight=body.highlight, wish=body.wish,
        )
        woche = ccs.week_start()
        await progress.award(conn, couple_id, user_id, "checkin_done", woche.isoformat())
        state = await ccs.load_week(conn, couple_id, user_id)
        if not state["both_done"]:
            await notify.to_partner(conn, couple_id, user_id, notify.checkin_done())
        return CoupleCheckinWeek(**state)


@router.get("/history", response_model=list[CoupleCheckinHistoryWeek])
async def checkin_history(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> list[CoupleCheckinHistoryWeek]:
    async with pool.acquire() as conn:
        rows = await ccs.load_history(conn, couple_id, current["user_id"])
    return [CoupleCheckinHistoryWeek(**r) for r in rows]

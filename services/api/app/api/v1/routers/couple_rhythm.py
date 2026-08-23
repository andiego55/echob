"""Router: die wiederkehrenden Anlaesse im Paarraum (Paartherapie, Rhythmus).

  GET  /couple/links/{couple_id}/checkin           - Check-in der laufenden Woche
  PUT  /couple/links/{couple_id}/checkin           - eigene Antwort speichern
  GET  /couple/links/{couple_id}/checkin/history   - die letzten Wochen als Stimmungs-Zeitstrahl
  GET  /couple/links/{couple_id}/wertschaetzung    - beide Richtungen
  POST /couple/links/{couple_id}/wertschaetzung    - einen Satz dalassen
  POST /couple/links/{couple_id}/wertschaetzung/gesehen - den "neu"-Hinweis abhaken
  GET  /couple/links/{couple_id}/barometer         - beide Regler + eigener Verlauf
  PUT  /couple/links/{couple_id}/barometer         - eigenen Regler stellen

Sicherheit: alles ueber ``require_couple_member`` im Service (404 fuer Fremde). Kein Zugriff
auf Fall-Daten, kein Echo-Aufruf - der Check-in ist bewusst ein reines Zwischen-euch-Ritual.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_checkin import (
    CoupleAppreciation,
    CoupleAppreciationCreate,
    CoupleAppreciationWall,
    CoupleBarometerSet,
    CoupleBarometerState,
    CoupleCheckinHistoryWeek,
    CoupleCheckinSave,
    CoupleCheckinWeek,
)
from app.services import couple_appreciation_service as cas_appr
from app.services import couple_barometer_service as cbar
from app.services import couple_checkin_service as ccs
from app.services import couple_notify_service as notify
from app.services import couple_progress_service as progress

router = APIRouter(prefix="/couple/links/{couple_id}", tags=["couple-rhythm"])


@router.get("/checkin", response_model=CoupleCheckinWeek)
async def get_checkin(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleCheckinWeek:
    async with pool.acquire() as conn:
        return CoupleCheckinWeek(**await ccs.load_week(conn, couple_id, current["user_id"]))


@router.put("/checkin", response_model=CoupleCheckinWeek)
async def save_checkin(
    couple_id: UUID, body: CoupleCheckinSave,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleCheckinWeek:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        await ccs.save(
            conn, couple_id, user_id,
            moods=body.moods, highlight=body.highlight, wish=body.wish,
        )
        woche = ccs.week_start()
        await progress.award(conn, couple_id, user_id, "checkin_done", woche.isoformat())
        state = await ccs.load_week(conn, couple_id, user_id)
        if not state["both_done"]:
            await notify.to_partner(conn, couple_id, user_id, notify.checkin_done())
        return CoupleCheckinWeek(**state)


@router.get("/checkin/history", response_model=list[CoupleCheckinHistoryWeek])
async def checkin_history(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> list[CoupleCheckinHistoryWeek]:
    async with pool.acquire() as conn:
        rows = await ccs.load_history(conn, couple_id, current["user_id"])
    return [CoupleCheckinHistoryWeek(**r) for r in rows]


# ── Wertschaetzung ──────────────────────────────────────────────────────────
# Bewusst ohne die Blindheitsregel des Check-ins: ein Geschenk, kein Zug im Wechselspiel.


@router.get("/wertschaetzung", response_model=CoupleAppreciationWall)
async def get_appreciations(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleAppreciationWall:
    async with pool.acquire() as conn:
        data = await cas_appr.load_wall(conn, couple_id, current["user_id"])
    return CoupleAppreciationWall(**data)


@router.post("/wertschaetzung", response_model=CoupleAppreciation, status_code=201)
async def leave_appreciation(
    couple_id: UUID, body: CoupleAppreciationCreate,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleAppreciation:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        row = await cas_appr.leave(conn, couple_id, user_id, body.body)
        await progress.award(conn, couple_id, user_id, "appreciation_left", row["id"])
        await notify.to_partner(conn, couple_id, user_id, notify.appreciation_left())
    return CoupleAppreciation(
        **row, from_name="Du", is_own=True,
    )


@router.post("/wertschaetzung/gesehen")
async def mark_appreciations_seen(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> dict[str, int]:
    """Hakt den „neu"-Hinweis ab. Wer sie geschrieben hat, erfaehrt davon nichts."""
    async with pool.acquire() as conn:
        anzahl = await cas_appr.mark_seen(conn, couple_id, current["user_id"])
    return {"seen": anzahl}


# ── Stimmungsbarometer ──────────────────────────────────────────────────────
# Zustand, kein Urteil: Wie geht es DIR gerade mit euch. Ohne Blindheitsregel - ein
# Barometer, das man erst nach eigener Eingabe sieht, waere keines.


@router.get("/barometer", response_model=CoupleBarometerState)
async def get_barometer(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleBarometerState:
    async with pool.acquire() as conn:
        data = await cbar.load_state(conn, couple_id, current["user_id"])
    return CoupleBarometerState(**data)


@router.put("/barometer", response_model=CoupleBarometerState)
async def set_barometer(
    couple_id: UUID, body: CoupleBarometerSet,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleBarometerState:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        neu = await cbar.set_value(conn, couple_id, user_id, body.value, body.note)
        # Einmal am Tag zaehlt es - der Regler soll nicht zum Punkte-Automaten werden.
        await progress.award(conn, couple_id, user_id, "barometer_set",
                             neu["created_at"].date().isoformat())

        # Nur bei einem deutlichen Absacken. Eine Meldung bei jedem Regler-Zupfen waere
        # Laerm; ein Einbruch ist genau der Moment, in dem Nachfragen etwas bringt.
        vorher = neu.get("previous_value")
        if vorher is not None and vorher - neu["value"] >= cbar.DROP_NOTICE:
            await notify.to_partner(conn, couple_id, user_id, notify.barometer_dropped())

        data = await cbar.load_state(conn, couple_id, user_id)
    return CoupleBarometerState(**data)

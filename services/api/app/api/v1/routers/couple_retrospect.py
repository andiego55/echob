"""Router: Rueckblick ueber Zeit im Paarraum.

  GET    /couple/links/{couple_id}/rueckblick   - Zahlen des Zeitraums + fruehere Rueckblicke
  POST   /couple/links/{couple_id}/rueckblick   - Echo schreibt einen neuen
  DELETE /couple/rueckblick/{retro_id}          - einen wegwerfen

Sicherheit: alles ueber ``require_couple_member`` im Service (404 fuer Fremde). Echo bekommt
ausschliesslich AGGREGATE - keine Beitraege, keine Kontexte, keine vertraulichen Texte und
insbesondere nicht die Tageskurve der anderen Person.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_retrospect import (
    CoupleRetrospectCreate,
    CoupleRetrospective,
    CoupleRetrospectStats,
    CoupleRetrospectView,
)
from app.services import couple_retrospect_service as crs
from app.services.subscription_service import enforce_echo_prompt_limit

router = APIRouter(prefix="/couple", tags=["couple-retrospect"])

_PROMPT = "echo_couple_retrospect_prompt.md"


def _echo(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


def _stats_out(stats: dict) -> CoupleRetrospectStats:
    ohne_namen = {k: v for k, v in stats.items() if k != "names"}
    return CoupleRetrospectStats(**ohne_namen, has_substance=crs.has_substance(stats))


@router.get("/links/{couple_id}/rueckblick", response_model=CoupleRetrospectView)
async def get_retrospect(
    couple_id: UUID, days: int = crs.DEFAULT_DAYS,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleRetrospectView:
    """Die Zahlen werden jedes Mal frisch gerechnet — nur Echos Text bleibt gespeichert."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        stats = await crs.load_stats(conn, couple_id, user_id, max(crs.MIN_DAYS, days))
        frueher = await crs.list_all(conn, couple_id, user_id)
    return CoupleRetrospectView(
        stats=_stats_out(stats),
        retrospectives=[CoupleRetrospective(**r) for r in frueher],
    )


@router.post("/links/{couple_id}/rueckblick", response_model=CoupleRetrospective,
             status_code=201)
async def write_retrospect(
    couple_id: UUID, body: CoupleRetrospectCreate, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleRetrospective:
    user_id = current["user_id"]
    echo_svc = _echo(request)
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        stats = await crs.load_stats(conn, couple_id, user_id, body.days)
        if not crs.has_substance(stats):
            # Ein Text über einen leeren Zeitraum wäre schlimmer als keiner: Er täte so,
            # als gäbe es etwas zu sehen, und entwertete das Format.
            raise HTTPException(
                status_code=400,
                detail="Für einen Rückblick ist noch zu wenig passiert. "
                       "Fangt mit dem Barometer oder einem Check-in an.",
            )

        text = await echo_svc.professional_chat(
            user_message=(
                "Schreib den Rückblick nach den vorgegebenen vier Abschnitten. "
                "Nur aus diesen Zahlen, nichts hinzuerfinden.\n\n" + crs.build_input(stats)
            ),
            shared_context="", history=[], prompt_file=_PROMPT,
        )
        row = await crs.save(
            conn, couple_id, user_id, body=text,
            period_start=stats["period_start"], period_end=stats["period_end"],
        )
    return CoupleRetrospective(**row)


@router.delete("/rueckblick/{retro_id}")
async def delete_retrospect(
    retro_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> dict[str, bool]:
    async with pool.acquire() as conn:
        await crs.delete(conn, retro_id, current["user_id"])
    return {"deleted": True}

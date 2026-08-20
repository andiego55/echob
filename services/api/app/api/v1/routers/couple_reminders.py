"""Router: Erinnerungen ausserhalb der App.

  GET  /couple/links/{couple_id}/erinnerungen   - eigene Einstellung
  PUT  /couple/links/{couple_id}/erinnerungen   - ein-/ausschalten
  POST /couple/erinnerungen/versenden           - ein Versandlauf (nur mit Cron-Token)

Der Versandlauf hat bewusst KEINEN Zeitplan im Code: Prod betreibt nur postgres, api und
caddy - es gibt keinen Worker und keinen Scheduler. Ein Scheduler im API-Prozess wuerde
ausserdem bei mehreren Uvicorn-Arbeitern mehrfach feuern. Der Lauf wird deshalb von aussen
angestossen (Cron auf dem Server) und ist mit einem gemeinsamen Geheimnis geschuetzt.

Fail-closed: Ist ``cron_token`` nicht gesetzt, ist der Endpunkt abgeschaltet - es gibt
keinen Zustand, in dem er unbewacht erreichbar waere.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.core.config import settings
from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_reminder import CoupleReminderSettings, CoupleReminderUpdate
from app.services import couple_reminder_service as crem

router = APIRouter(prefix="/couple", tags=["couple-reminders"])


@router.get("/links/{couple_id}/erinnerungen", response_model=CoupleReminderSettings)
async def get_reminders(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleReminderSettings:
    async with pool.acquire() as conn:
        data = await crem.get_settings(conn, couple_id, current["user_id"])
    return CoupleReminderSettings(**data)


@router.put("/links/{couple_id}/erinnerungen", response_model=CoupleReminderSettings)
async def set_reminders(
    couple_id: UUID, body: CoupleReminderUpdate,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleReminderSettings:
    async with pool.acquire() as conn:
        data = await crem.set_settings(
            conn, couple_id, current["user_id"], email_enabled=body.email_enabled,
        )
    return CoupleReminderSettings(**data)


@router.post("/erinnerungen/versenden")
async def run_reminders(
    request: Request,
    x_cron_token: str = Header(default=""),
    pool=Depends(get_pool),
) -> dict[str, int]:
    """Ein Erinnerungslauf. Wird vom Cron auf dem Server angestossen."""
    erwartet = settings.cron_token
    if not erwartet or x_cron_token != erwartet:
        # Dieselbe Antwort fuer "abgeschaltet" und "falsches Token" - der Endpunkt soll
        # von aussen nicht verraten, ob es ihn ueberhaupt gibt.
        raise HTTPException(status_code=404, detail="Nicht gefunden.")

    supabase = getattr(request.app.state, "supabase", None)
    if supabase is None:
        raise HTTPException(status_code=503, detail="Auth-Dienst nicht verfügbar.")

    async with pool.acquire() as conn:
        ergebnis = await crem.run(conn, supabase, settings.frontend_url.rstrip("/"))
    return ergebnis

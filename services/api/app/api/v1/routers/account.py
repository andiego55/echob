"""Router: Konto & DSGVO-Datenrechte — /api/v1/account"""
from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import Client as SupabaseClient

from app.core.dependencies import get_current_user, get_pool, get_supabase
from app.services import einwilligung_service
from app.services.account_service import (
    delete_user_data,
    export_user_data,
    get_latest_consent,
    hat_audio_einwilligung,
    record_audio_consent,
    record_consent,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/account", tags=["account"])


@router.get("/export")
async def export_account(
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> JSONResponse:
    """DSGVO Art. 15/20 – vollständiger Export der eigenen Daten als JSON-Download."""
    async with pool.acquire() as conn:
        data = await export_user_data(
            conn, current_user["user_id"], current_user.get("email")
        )
    payload = {
        "export_metadata": {
            "service": "EchoB",
            "exported_at": datetime.now(UTC).isoformat(),
            "user_id": current_user["user_id"],
            "email": current_user.get("email"),
            "hinweis": "Auskunft nach Art. 15 DSGVO / Datenübertragbarkeit nach Art. 20 DSGVO.",
        },
        "data": data,
    }
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": 'attachment; filename="echob-datenexport.json"'},
    )


@router.delete("", status_code=status.HTTP_200_OK)
async def delete_account(
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
    supabase: SupabaseClient = Depends(get_supabase),
) -> dict:
    """DSGVO Art. 17 – löscht endgültig alle Daten UND das Auth-Konto der Person.

    Reihenfolge: erst die DB-Daten (eine Transaktion), dann das Supabase-Auth-Konto.
    """
    user_id = current_user["user_id"]

    async with pool.acquire() as conn:
        counts = await delete_user_data(conn, user_id, current_user.get("email"))

    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("Auth-Konto-Löschung fehlgeschlagen (user_id=%s): %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Deine Daten wurden gelöscht, aber das Login-Konto konnte nicht entfernt "
                "werden. Bitte info@echo-b.de kontaktieren."
            ),
        ) from exc

    logger.info("Konto gelöscht (user_id=%s, Zeilen gesamt=%s)", user_id, sum(counts.values()))
    return {"deleted": True, "rows": counts}


class ConsentBody(BaseModel):
    version: str
    privacy_policy: bool
    sensitive_ai: bool
    age_confirmed: bool
    #: Ab Fassung 2026-10-04-v2 getrennt. Optional, damit alte Clients nicht brechen —
    #: der Gate prueft ohnehin auf die aktuelle Fassung.
    inhalte: bool | None = None
    ki: bool | None = None
    items: dict | None = None


class WiderrufBody(BaseModel):
    """Welche Einwilligung widerrufen oder wieder erteilt werden soll."""

    was: str = "ki_verarbeitung"


@router.get("/einwilligungen")
async def get_einwilligungen(
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Was gilt gerade — für den Datenschutz-Bereich."""
    async with pool.acquire() as conn:
        return await einwilligung_service.stand(conn, current_user["user_id"])


@router.post("/einwilligungen/widerrufen")
async def post_widerruf(
    body: WiderrufBody,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Art. 7 Abs. 3 DSGVO — Widerruf, ohne Rückfrage und ohne Begründung.

    **Ohne Bestätigungsdialog, mit Absicht.** Der Widerruf muss so einfach sein wie die
    Erteilung, und die war ein Häkchen. Rückgängig machen kann die Person ihn jederzeit
    selbst; eine Rückfrage wäre die Hürde, die die Norm meint.
    """
    async with pool.acquire() as conn:
        return await einwilligung_service.widerrufen(
            conn, current_user["user_id"], body.was,
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )


@router.post("/einwilligungen/erteilen")
async def post_erneut(
    body: WiderrufBody,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Einen Widerruf aufheben — die Person willigt wieder ein."""
    async with pool.acquire() as conn:
        return await einwilligung_service.erneut_einwilligen(
            conn, current_user["user_id"], body.was)


class AudioEinwilligungBody(BaseModel):
    version: str


@router.get("/audio-einwilligung")
async def get_audio_einwilligung(
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Darf ein Mikrofon benutzt werden?"""
    async with pool.acquire() as conn:
        return {"audio": await hat_audio_einwilligung(conn, current_user["user_id"])}


@router.post("/audio-einwilligung")
async def post_audio_einwilligung(
    body: AudioEinwilligungBody,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Die Audio-Einwilligung, beim ersten Aufnahmeversuch erteilt.

    Eigene Zeile mit ``art = 'audio'`` — sonst hielte die Abfrage der jüngsten Einwilligung
    sie für den Zugang und schlüge den Einwilligungs-Dialog erneut auf.
    """
    async with pool.acquire() as conn:
        return await record_audio_consent(conn, current_user["user_id"], body.version)


@router.get("/consent")
async def get_consent(
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict | None:
    """Neueste erteilte Einwilligung der Person (oder null)."""
    async with pool.acquire() as conn:
        return await get_latest_consent(conn, current_user["user_id"])


@router.post("/consent")
async def post_consent(
    body: ConsentBody,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """DSGVO Art. 7 – protokolliert eine erteilte (granulare, versionierte) Einwilligung."""
    async with pool.acquire() as conn:
        return await record_consent(
            conn,
            current_user["user_id"],
            body.version,
            body.privacy_policy,
            body.sensitive_ai,
            body.age_confirmed,
            body.items,
            inhalte=body.inhalte,
            ki=body.ki,
        )

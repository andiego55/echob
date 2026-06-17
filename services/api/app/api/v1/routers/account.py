"""Router: Konto & DSGVO-Datenrechte — /api/v1/account"""
from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from supabase import Client as SupabaseClient

from app.core.dependencies import get_current_user, get_pool, get_supabase
from app.services.account_service import (
    delete_user_data,
    export_user_data,
    get_latest_consent,
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
    items: dict | None = None


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
            body.items,
        )

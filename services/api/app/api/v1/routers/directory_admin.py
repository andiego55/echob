"""Router: Verzeichnis-Admin (Gründer) — /directory/admin

Nur der konfigurierte Admin (settings.admin_user_id) darf hier Fachpersonen
recherchieren, anlegen, bearbeiten und einladen (Probeaccount + vorbefülltes Profil).
"""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_pool, get_supabase, require_admin
from app.schemas.directory import (
    AdminInvite,
    AdminInviteResult,
    AdminListingCreate,
    AdminListingRow,
    AdminListingUpdate,
)
from app.services import directory_service

router = APIRouter(prefix="/directory/admin", tags=["directory-admin"])


@router.get("/listings", response_model=list[AdminListingRow])
async def list_listings(
    status: str | None = None,
    _admin: dict = Depends(require_admin),
    pool: asyncpg.Pool = Depends(get_pool),
) -> list[AdminListingRow]:
    return await directory_service.admin_list(pool, status)


@router.post("/listings", response_model=AdminListingRow, status_code=201)
async def create_listing(
    payload: AdminListingCreate,
    _admin: dict = Depends(require_admin),
    pool: asyncpg.Pool = Depends(get_pool),
) -> AdminListingRow:
    return await directory_service.admin_create(pool, payload)


@router.patch("/listings/{listing_id}", response_model=AdminListingRow)
async def update_listing(
    listing_id: str,
    payload: AdminListingUpdate,
    _admin: dict = Depends(require_admin),
    pool: asyncpg.Pool = Depends(get_pool),
) -> AdminListingRow:
    try:
        row = await directory_service.admin_update(pool, listing_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    if not row:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden.")
    return row


@router.delete("/listings/{listing_id}")
async def delete_listing(
    listing_id: str,
    _admin: dict = Depends(require_admin),
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    if not await directory_service.admin_delete(pool, listing_id):
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden.")
    return {"deleted": True}


@router.post("/listings/{listing_id}/invite", response_model=AdminInviteResult)
async def invite_listing(
    listing_id: str,
    payload: AdminInvite,
    _admin: dict = Depends(require_admin),
    pool: asyncpg.Pool = Depends(get_pool),
    supabase=Depends(get_supabase),
) -> AdminInviteResult:
    return await directory_service.admin_invite(pool, supabase, listing_id, payload.email)

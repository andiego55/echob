"""Alle Admin-Endpunkte unter ``/admin`` — die einzige Naht zum Rest der API.

``require_admin`` hängt am **Router**, nicht an den einzelnen Funktionen: So kann kein
neuer Endpunkt hier ungeschützt entstehen, auch nicht durch Kopieren aus einem
öffentlichen Router. Ein Wächter-Test prüft das zusätzlich für jede einzelne Route
(``app/tests/test_admin_gate.py``).
"""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile

from app.admin import invites, listings, provisioning, users
from app.admin.schemas import (
    InviteDraft,
    InviteResult,
    InviteSend,
    ListingCreate,
    ListingDetail,
    ListingRow,
    ListingUpdate,
    PhotoResult,
    ProvisionRequest,
    ProvisionResult,
    UserRow,
)
from app.core.dependencies import get_pool, get_supabase, require_admin
from app.core.logging import get_logger
from app.services import directory_service

logger = get_logger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ── Einträge ─────────────────────────────────────────────────────────────────

@router.get("/listings", response_model=list[ListingRow])
async def listings_list(
    status: str | None = None,
    pool: asyncpg.Pool = Depends(get_pool),
) -> list[ListingRow]:
    return await listings.liste(pool, status)


@router.get("/listings/{listing_id}", response_model=ListingDetail)
async def listing_get(
    listing_id: str,
    pool: asyncpg.Pool = Depends(get_pool),
) -> ListingDetail:
    row = await listings.holen(pool, listing_id)
    if not row:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden.")
    return row


@router.post("/listings", response_model=ListingRow, status_code=201)
async def listing_create(
    payload: ListingCreate,
    pool: asyncpg.Pool = Depends(get_pool),
) -> ListingRow:
    return await listings.anlegen(pool, payload)


@router.patch("/listings/{listing_id}", response_model=ListingRow)
async def listing_update(
    listing_id: str,
    payload: ListingUpdate,
    pool: asyncpg.Pool = Depends(get_pool),
) -> ListingRow:
    try:
        row = await listings.aendern(pool, listing_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    if not row:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden.")
    return row


@router.delete("/listings/{listing_id}")
async def listing_delete(
    listing_id: str,
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    if not await listings.loeschen(pool, listing_id):
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden.")
    return {"deleted": True}


@router.post("/listings/{listing_id}/photo", response_model=PhotoResult)
async def listing_photo(
    listing_id: str,
    file: UploadFile,
    pool: asyncpg.Pool = Depends(get_pool),
) -> PhotoResult:
    if file.content_type not in directory_service.FOTO_TYPEN:
        raise HTTPException(status_code=415, detail="Nur JPG, PNG oder WebP.")
    data = await file.read()
    if len(data) > directory_service.FOTO_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Bild zu groß (max. 4 MB).")
    if len(data) < 100:
        raise HTTPException(status_code=422, detail="Leere Datei.")
    try:
        url = await listings.foto_setzen(pool, listing_id, data, file.content_type)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001 — Upload-Fehler dem Client als 502 melden
        logger.warning("Foto-Upload (Admin) fehlgeschlagen: %s", e)
        raise HTTPException(status_code=502, detail="Bild-Upload fehlgeschlagen.") from e
    return PhotoResult(photo_url=url)


# ── Zugang ───────────────────────────────────────────────────────────────────

@router.post("/listings/{listing_id}/provision", response_model=ProvisionResult)
async def listing_provision(
    listing_id: str,
    payload: ProvisionRequest,
    pool: asyncpg.Pool = Depends(get_pool),
    supabase=Depends(get_supabase),
) -> ProvisionResult:
    """Legt ein Fachpersonen-Konto an, ohne irgendetwas zu verschicken.

    Das Startpasswort steht **nur** in dieser einen Antwort.
    """
    return await provisioning.konto_vorbereiten(pool, supabase, listing_id, payload.email)


@router.get("/listings/{listing_id}/invite/draft", response_model=InviteDraft)
async def invite_draft(
    listing_id: str,
    email: str | None = Query(default=None),
    pool: asyncpg.Pool = Depends(get_pool),
) -> InviteDraft:
    """Vorschlagstext für die Einladung. Legt nichts an und verschickt nichts."""
    entwurf = await invites.entwurf(pool, listing_id, email)
    if not entwurf:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden.")
    return entwurf


@router.post("/listings/{listing_id}/invite", response_model=InviteResult)
async def invite_send(
    listing_id: str,
    payload: InviteSend,
    pool: asyncpg.Pool = Depends(get_pool),
    supabase=Depends(get_supabase),
) -> InviteResult:
    """Verschickt die Einladung mit dem übergebenen Text. Legt dabei das Konto an."""
    return await invites.senden(pool, supabase, listing_id, payload)


# ── Konten ───────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserRow])
async def users_list(
    rolle: str | None = Query(default=None, description="professional | institute | student"),
    q: str | None = Query(default=None, description="Suche in Name und E-Mail"),
    pool: asyncpg.Pool = Depends(get_pool),
) -> list[UserRow]:
    return await users.liste(pool, rolle, q)

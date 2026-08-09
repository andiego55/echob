"""Router: Selfservice-Profil der Fachperson fürs Verzeichnis — /directory/me

Authentifiziert (Fachpersonen-Konto). Eine Fachperson pflegt genau EIN Listing
(directory_listings.claimed_by_user_id = eigene user_id). Der öffentliche Teil
liegt in directory.py.
"""
from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.core.dependencies import get_current_professional, get_pool
from app.core.logging import get_logger
from app.schemas.directory import DirectoryMe, DirectoryProfileUpdate, PhotoResult
from app.services import directory_service

logger = get_logger(__name__)
router = APIRouter(prefix="/directory", tags=["directory"])

_MAX_PHOTO = 4 * 1024 * 1024
_ALLOWED = {"image/jpeg", "image/png", "image/webp"}


@router.get("/me", response_model=DirectoryMe)
async def my_listing(
    prof: dict = Depends(get_current_professional),
    pool: asyncpg.Pool = Depends(get_pool),
) -> DirectoryMe:
    """Eigenes Verzeichnis-Listing laden (legt bei Bedarf einen Entwurf an)."""
    p = prof["professional"]
    return await directory_service.get_or_create_my_listing(
        pool, prof["user_id"], p.get("display_name"), prof.get("email") or p.get("email")
    )


@router.put("/me", response_model=DirectoryMe)
async def save_my_listing(
    payload: DirectoryProfileUpdate,
    prof: dict = Depends(get_current_professional),
    pool: asyncpg.Pool = Depends(get_pool),
) -> DirectoryMe:
    try:
        return await directory_service.update_my_listing(
            pool, prof["user_id"], payload, prof.get("email")
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/me/photo", response_model=PhotoResult)
async def upload_my_photo(
    file: UploadFile,
    prof: dict = Depends(get_current_professional),
    pool: asyncpg.Pool = Depends(get_pool),
) -> PhotoResult:
    if file.content_type not in _ALLOWED:
        raise HTTPException(status_code=415, detail="Nur JPG, PNG oder WebP.")
    data = await file.read()
    if len(data) > _MAX_PHOTO:
        raise HTTPException(status_code=413, detail="Bild zu groß (max. 4 MB).")
    if len(data) < 100:
        raise HTTPException(status_code=422, detail="Leere Datei.")
    try:
        url = await directory_service.set_my_photo(pool, prof["user_id"], data, file.content_type)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001 — Upload-Fehler dem Client als 502 melden
        logger.warning("Foto-Upload fehlgeschlagen: %s", e)
        raise HTTPException(status_code=502, detail="Bild-Upload fehlgeschlagen. Bitte später erneut versuchen.") from e
    return PhotoResult(photo_url=url)

"""Router: öffentliches Fachpersonen-Verzeichnis — /directory

Alles öffentlich (kein Login). Suche/Facetten/Detail lesen; Kontaktanfrage schreibt
eine gespeicherte, best-effort weitergeleitete Anfrage (Rate-Limit + Honeypot).
"""
from __future__ import annotations

import time

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.dependencies import get_pool
from app.schemas.directory import (
    ContactAck,
    DirectoryContactCreate,
    DirectoryDetail,
    DirectoryFacets,
    DirectorySearchResponse,
)
from app.services import directory_service

router = APIRouter(prefix="/directory", tags=["directory"])

# In-Memory-Rate-Limit (pro Worker) fürs öffentliche Kontaktformular.
_WINDOW = 3600
_MAX = 5
_hits: dict[str, list[float]] = {}


def _rate_ok(ip: str) -> bool:
    now = time.time()
    if len(_hits) > 5000:
        _hits.clear()
    recent = [t for t in _hits.get(ip, []) if now - t < _WINDOW]
    if len(recent) >= _MAX:
        _hits[ip] = recent
        return False
    recent.append(now)
    _hits[ip] = recent
    return True


@router.get("/search", response_model=DirectorySearchResponse)
async def search(
    q: str | None = Query(default=None, max_length=120),
    profession: str | None = Query(default=None, max_length=60),
    city: str | None = Query(default=None, max_length=80),
    format: str | None = Query(default=None, max_length=20),
    free_intro: bool = Query(default=False),
    page: int = Query(default=1, ge=1, le=200),
    pool: asyncpg.Pool = Depends(get_pool),
) -> DirectorySearchResponse:
    """Verzeichnissuche mit Filtern. Sortierung: Partner/Profile vor recherchierten."""
    limit = 24
    total, items = await directory_service.search_listings(
        pool, q=q, profession=profession, city=city, fmt=format,
        free_intro=free_intro, limit=limit, offset=(page - 1) * limit,
    )
    return DirectorySearchResponse(total=total, items=items)


@router.get("/facets", response_model=DirectoryFacets)
async def facets(pool: asyncpg.Pool = Depends(get_pool)) -> DirectoryFacets:
    """Verfügbare Kategorien und Städte (mit Anzahl) für die Filter-UI."""
    return await directory_service.get_facets(pool)


@router.get("/listings/{slug}", response_model=DirectoryDetail)
async def get_detail(slug: str, pool: asyncpg.Pool = Depends(get_pool)) -> DirectoryDetail:
    listing = await directory_service.get_listing(pool, slug)
    if not listing:
        raise HTTPException(status_code=404, detail="Fachperson nicht gefunden.")
    return listing


@router.post("/listings/{slug}/contact", response_model=ContactAck, status_code=201)
async def contact(
    slug: str,
    payload: DirectoryContactCreate,
    request: Request,
    pool: asyncpg.Pool = Depends(get_pool),
) -> ContactAck:
    """Kontakt-/Terminanfrage an eine gelistete (zugestimmte) Fachperson."""
    # Honeypot: von Bots ausgefüllt → wir bestätigen, tun aber nichts.
    if payload.company:
        return ContactAck(message="Danke! Deine Anfrage wurde weitergeleitet.")
    ip = request.client.host if request.client else "unknown"
    if not _rate_ok(ip):
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte später erneut versuchen.")
    ack = await directory_service.create_contact_request(pool, slug, payload, ip)
    if ack is None:
        raise HTTPException(
            status_code=409,
            detail="Diese Fachperson ist über EchoB nicht kontaktierbar.",
        )
    return ack

"""Öffentlicher Bild-Upload über die Supabase-Storage-REST-API mit dem
Service-Role-Key (umgeht RLS, legt den Bucket bei Bedarf selbst an).

Bewusst per httpx gegen die stabile REST-API statt über das SDK → keine
Versions-Überraschungen. Genutzt für Fachpersonen-Profilfotos.
"""
from __future__ import annotations

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

BUCKET = "directory-photos"
_bucket_ready = False


def _headers(extra: dict | None = None) -> dict:
    h = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }
    if extra:
        h.update(extra)
    return h


async def _ensure_bucket(client: httpx.AsyncClient) -> None:
    global _bucket_ready
    if _bucket_ready:
        return
    r = await client.post(
        f"{settings.supabase_url}/storage/v1/bucket",
        headers=_headers({"Content-Type": "application/json"}),
        json={"id": BUCKET, "name": BUCKET, "public": True},
    )
    # 200/201 = neu angelegt; 400/409 = existiert bereits → beides ok.
    if r.status_code < 300 or r.status_code in (400, 409):
        _bucket_ready = True
    else:
        r.raise_for_status()


async def upload_public_image(path: str, data: bytes, content_type: str) -> str:
    """Lädt ``data`` nach ``directory-photos/<path>`` und gibt die öffentliche URL zurück."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase Storage ist nicht konfiguriert (SUPABASE_URL/SERVICE_ROLE_KEY).")
    async with httpx.AsyncClient(timeout=20.0) as client:
        await _ensure_bucket(client)
        r = await client.post(
            f"{settings.supabase_url}/storage/v1/object/{BUCKET}/{path}",
            headers=_headers({"Content-Type": content_type, "x-upsert": "true"}),
            content=data,
        )
        r.raise_for_status()
    logger.info("Profilfoto hochgeladen: %s", path)
    return f"{settings.supabase_url}/storage/v1/object/public/{BUCKET}/{path}"

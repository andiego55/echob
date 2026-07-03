"""Router: öffentliche Kontakt-/Lead-Anfragen — POST /contact"""
import time

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_pool
from app.schemas.contact import ContactRequest, ContactResponse
from app.services.contact_service import create_contact_request

router = APIRouter()

_MSG = "Danke! Wir melden uns innerhalb von 24 Stunden."

# Einfaches In-Memory-Rate-Limit (pro Worker): max. _MAX Anfragen je IP / _WINDOW.
# Ergänzt den Honeypot gegen Spam/Fluten des öffentlichen Formulars.
_WINDOW = 3600
_MAX = 5
_hits: dict[str, list[float]] = {}


def _rate_ok(ip: str) -> bool:
    now = time.time()
    if len(_hits) > 5000:            # gelegentlicher Frühjahrsputz gegen unbegrenztes Wachstum
        _hits.clear()
    recent = [t for t in _hits.get(ip, []) if now - t < _WINDOW]
    if len(recent) >= _MAX:
        _hits[ip] = recent
        return False
    recent.append(now)
    _hits[ip] = recent
    return True


@router.post(
    "/contact",
    response_model=ContactResponse,
    status_code=201,
    summary="Kontakt-/Lead-Anfrage (öffentlich)",
    description="Niedrigschwelliges Lead-Formular. E-Mail oder Telefon genügt; "
                "die Anfrage wird gespeichert und best-effort an kontakt@echo-b.de gemeldet.",
)
async def submit_contact(
    payload: ContactRequest,
    request: Request,
    pool: asyncpg.Pool = Depends(get_pool),
) -> ContactResponse:
    # Honeypot: von Bots ausgefüllt → wir bestätigen, speichern/versenden aber nichts.
    if payload.company:
        return ContactResponse(message=_MSG)
    ip = request.client.host if request.client else "unknown"
    if not _rate_ok(ip):
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte versuche es später erneut.")
    await create_contact_request(pool, payload)
    return ContactResponse(message=_MSG)

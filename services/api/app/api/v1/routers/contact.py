"""Router: öffentliche Kontakt-/Lead-Anfragen — POST /contact"""
import asyncpg
from fastapi import APIRouter, Depends

from app.core.dependencies import get_pool
from app.schemas.contact import ContactRequest, ContactResponse
from app.services.contact_service import create_contact_request

router = APIRouter()

_MSG = "Danke! Wir melden uns innerhalb von 24 Stunden."


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
    pool: asyncpg.Pool = Depends(get_pool),
) -> ContactResponse:
    # Honeypot: von Bots ausgefüllt → wir bestätigen, speichern/versenden aber nichts.
    if payload.company:
        return ContactResponse(message=_MSG)
    await create_contact_request(pool, payload)
    return ContactResponse(message=_MSG)

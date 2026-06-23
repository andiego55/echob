import asyncpg
from fastapi import APIRouter, Depends

from app.core.dependencies import get_pool
from app.schemas.waitlist import (
    DirectoryWaitlistRequest,
    WaitlistCreateRequest,
    WaitlistCreateResponse,
)
from app.services.waitlist_service import add_to_directory_waitlist, add_to_waitlist

router = APIRouter()


@router.post(
    "/waitlist",
    response_model=WaitlistCreateResponse,
    status_code=201,
    summary="Warteliste beitreten",
    description=(
        "Trägt eine E-Mail-Adresse in die EchoB-Warteliste ein. "
        "Duplikate werden idempotent behandelt (immer 201)."
    ),
)
async def join_waitlist(
    payload: WaitlistCreateRequest,
    pool: asyncpg.Pool = Depends(get_pool),
) -> WaitlistCreateResponse:
    return await add_to_waitlist(pool, payload)


@router.post(
    "/directory-waitlist",
    response_model=WaitlistCreateResponse,
    status_code=201,
    summary="Ins Fachpersonen-Verzeichnis eintragen",
    description=(
        "Öffentliches Lead-Formular: Fachpersonen/Praxen/Coaches tragen sich "
        "kostenfrei ins künftige EchoB-Verzeichnis ein. Idempotent über die "
        "E-Mail – erneutes Absenden aktualisiert die Angaben."
    ),
)
async def join_directory_waitlist(
    payload: DirectoryWaitlistRequest,
    pool: asyncpg.Pool = Depends(get_pool),
) -> WaitlistCreateResponse:
    return await add_to_directory_waitlist(pool, payload)

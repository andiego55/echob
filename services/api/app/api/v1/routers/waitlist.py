import asyncpg
from fastapi import APIRouter, Depends

from app.core.dependencies import get_pool
from app.schemas.waitlist import WaitlistCreateRequest, WaitlistCreateResponse
from app.services.waitlist_service import add_to_waitlist

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

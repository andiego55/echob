"""
Waitlist-Service für EchoB.

Business-Logik für Wartelisten-Einträge.
Keine HTTP-Abhängigkeit – nur Python, damit einfach testbar.
"""
import hashlib

import asyncpg
from fastapi import HTTPException, status

from app.schemas.waitlist import WaitlistCreateRequest, WaitlistCreateResponse
from app.core.logging import get_logger

logger = get_logger(__name__)

_MSG_SUCCESS   = "Du stehst auf der Liste. Wir melden uns, sobald EchoB startet."
_MSG_DUPLICATE = "Du stehst bereits auf der Liste. Wir melden uns bald!"


def _mask_email(email: str) -> str:
    """Gibt einen gekürzten SHA-256-Hash zurück – kein PII in Logs."""
    return hashlib.sha256(email.encode()).hexdigest()[:12] + "…"


async def add_to_waitlist(
    pool: asyncpg.Pool,
    payload: WaitlistCreateRequest,
) -> WaitlistCreateResponse:
    """
    Trägt eine E-Mail-Adresse atomar in die Warteliste ein.

    Verwendet INSERT … ON CONFLICT DO NOTHING statt SELECT-before-INSERT,
    um Race Conditions (TOCTOU) zu vermeiden. Der UNIQUE-Index auf
    waitlist.email in der Datenbank ist die einzige Quelle der Wahrheit.

    Duplikate werden idempotent behandelt: immer 201, kein Info-Leak
    via HTTP-Status.
    """
    email   = str(payload.email)
    masked  = _mask_email(email)

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO waitlist (email, interest, note)
            VALUES ($1, $2, $3)
            ON CONFLICT (email) DO NOTHING
            RETURNING id
            """,
            email,
            payload.interest,
            payload.note,
        )

    if row is None:
        # ON CONFLICT DO NOTHING → Duplikat
        logger.info(f"Warteliste: bereits eingetragen ({masked})")
        return WaitlistCreateResponse(message=_MSG_DUPLICATE, email=email)

    logger.info(f"Warteliste: neuer Eintrag ({masked}, interest={payload.interest})")
    return WaitlistCreateResponse(message=_MSG_SUCCESS, email=email)

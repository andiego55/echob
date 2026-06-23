"""
Waitlist-Service für EchoB.

Business-Logik für Wartelisten-Einträge.
Keine HTTP-Abhängigkeit – nur Python, damit einfach testbar.
"""
import hashlib
from datetime import UTC, datetime

import asyncpg

from app.core.logging import get_logger
from app.schemas.waitlist import (
    DirectoryWaitlistRequest,
    WaitlistCreateRequest,
    WaitlistCreateResponse,
)

logger = get_logger(__name__)

_MSG_SUCCESS   = "Du stehst auf der Liste. Wir melden uns, sobald EchoB startet."
_MSG_DUPLICATE = "Du stehst bereits auf der Liste. Wir melden uns bald!"

_MSG_DIR_NEW = (
    "Eintrag gespeichert. Sobald das EchoB-Verzeichnis startet, "
    "melden wir uns – die Listung ist und bleibt kostenfrei."
)
_MSG_DIR_UPDATED = "Deine Angaben wurden aktualisiert. Danke!"


def _clean(value: str | None) -> str | None:
    """Trimmt Freitext; leere Strings werden zu NULL."""
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


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


async def add_to_directory_waitlist(
    pool: asyncpg.Pool,
    payload: DirectoryWaitlistRequest,
) -> WaitlistCreateResponse:
    """
    Trägt eine Fachperson/Praxis ins Verzeichnis-Wartelisten ein (Lead).

    Idempotent über UNIQUE(email): ein erneutes Absenden mit derselben
    E-Mail aktualisiert die Angaben (DO UPDATE), statt zu duplizieren –
    so kann eine Fachperson ihren Eintrag korrigieren/ergänzen.
    """
    email  = str(payload.email)
    masked = _mask_email(email)
    consent_at = datetime.now(UTC) if payload.consent else None

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO directory_waitlist (
                name, email, organization, phone, website,
                profession, specialization, location, note, consent_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (email) DO UPDATE SET
                name           = EXCLUDED.name,
                organization   = EXCLUDED.organization,
                phone          = EXCLUDED.phone,
                website        = EXCLUDED.website,
                profession     = EXCLUDED.profession,
                specialization = EXCLUDED.specialization,
                location       = EXCLUDED.location,
                note           = EXCLUDED.note,
                consent_at     = COALESCE(EXCLUDED.consent_at, directory_waitlist.consent_at),
                updated_at     = NOW()
            RETURNING (xmax = 0) AS inserted
            """,
            _clean(payload.name),
            email,
            _clean(payload.organization),
            _clean(payload.phone),
            _clean(payload.website),
            _clean(payload.profession),
            _clean(payload.specialization),
            _clean(payload.location),
            _clean(payload.note),
            consent_at,
        )

    inserted = bool(row["inserted"]) if row else True
    if inserted:
        logger.info(f"Verzeichnis-Warteliste: neuer Eintrag ({masked}, beruf={payload.profession})")
        return WaitlistCreateResponse(message=_MSG_DIR_NEW, email=email)

    logger.info(f"Verzeichnis-Warteliste: aktualisiert ({masked})")
    return WaitlistCreateResponse(message=_MSG_DIR_UPDATED, email=email)

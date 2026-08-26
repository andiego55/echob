"""
Datenbankverbindung für EchoB.

- asyncpg: direkter Postgres-Zugang für eigene Tabellen (Warteliste, Cases, etc.)
- Supabase: Auth-Validierung (JWT) und zukünftig Storage/Realtime
"""
import asyncio
from contextlib import asynccontextmanager

import asyncpg
from fastapi import HTTPException, status
from supabase import Client as SupabaseClient
from supabase import create_client

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# asyncpg Connection Pool
# ---------------------------------------------------------------------------

def _asyncpg_dsn(url: str) -> str:
    """Konvertiert SQLAlchemy-DSN-Format zu nativem asyncpg-Format."""
    return url.replace("postgresql+asyncpg://", "postgresql://")


class PoolMitZeitlimit:
    """Der Verbindungspool, aber mit einer Notbremse beim Anfordern.

    **Das Versagensbild, das damit verschwindet.** ``pool.acquire()`` wartet in asyncpg
    voreingestellt **unbegrenzt**. Sind alle Verbindungen belegt, haengt jede weitere
    Anfrage - nicht mit einem Fehler, sondern fuer immer. Betroffen ist dann alles:
    Anmeldung, Uebersicht, Gesundheitspruefung. Von aussen sieht das aus wie ein toter
    Server, im Protokoll steht nichts, und ``restart: unless-stopped`` fasst den Container
    nicht an, weil er ja laeuft.

    Mit Zeitlimit wird daraus eine Stoerung statt eines Ausfalls: Die einzelne Anfrage
    scheitert sichtbar mit 503, alle anderen laufen weiter, und die Gesundheitspruefung
    schlaegt an.

    **Warum als Mantel und nicht an 481 Aufrufstellen.** ``async with pool.acquire()``
    steht 481 Mal im Code. Eine Aenderung dort waere ein Grossumbau mit 481 Gelegenheiten,
    etwas zu uebersehen - und die naechste neue Zeile haette das Zeitlimit wieder nicht.
    Hier ist es eine Eigenschaft des Pools; wer ihn benutzt, bekommt sie geschenkt.

    Alles ausser ``acquire`` reicht unveraendert durch (genutzt wird sonst nur ``close``).
    """

    def __init__(self, pool: asyncpg.Pool, zeitlimit: float) -> None:
        self._pool = pool
        self._zeitlimit = zeitlimit

    def acquire(self, *, timeout: float | None = None):
        return self._hole(timeout if timeout is not None else self._zeitlimit)

    @asynccontextmanager
    async def _hole(self, zeitlimit: float):
        try:
            # Das Zeitlimit wird HIER durchgesetzt, nicht der Bibliothek ueberlassen.
            # asyncpg beachtet seinen timeout-Parameter zwar, aber dann haengt die
            # Zusicherung an fremdem Verhalten - und genau das ist die Sorte Annahme, die
            # bei einem Versionssprung still verschwindet.
            conn = await asyncio.wait_for(self._pool.acquire(timeout=zeitlimit), zeitlimit)
        except (TimeoutError, asyncio.CancelledError):
            # Kein 500: Das ist kein Programmfehler, sondern Ueberlast. 503 sagt dem
            # Aufrufer die Wahrheit und haelt die Meldung aus Sentrys Fehlerliste heraus.
            logger.warning(
                "Keine freie Datenbankverbindung nach %.1f s - Anfrage abgewiesen.", zeitlimit
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="DB_BUSY",
            ) from None
        try:
            yield conn
        finally:
            await self._pool.release(conn)

    def __getattr__(self, name: str):
        return getattr(self._pool, name)


async def create_pool() -> asyncpg.Pool | None:
    """
    Erstellt den asyncpg-Verbindungspool.
    Gibt None zurück wenn DATABASE_URL nicht gesetzt ist (z. B. in Tests).
    """
    if not settings.database_url:
        logger.warning("DATABASE_URL nicht gesetzt – asyncpg-Pool wird nicht erstellt.")
        return None

    dsn = _asyncpg_dsn(settings.database_url)
    pool = await asyncpg.create_pool(dsn, min_size=2, max_size=10, command_timeout=30)
    logger.info(
        "asyncpg-Verbindungspool erstellt (min=2, max=10, Anforderungs-Zeitlimit %.0f s).",
        settings.db_acquire_timeout,
    )
    return PoolMitZeitlimit(pool, settings.db_acquire_timeout)


# ---------------------------------------------------------------------------
# Supabase Client
# ---------------------------------------------------------------------------

def create_supabase_admin() -> SupabaseClient | None:
    """
    Erstellt den Supabase-Admin-Client (service_role).
    Wird für JWT-Validierung in get_current_user verwendet.
    Gibt None zurück wenn die Keys nicht gesetzt sind.
    """
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning("Supabase nicht konfiguriert – Auth-Dependency gibt 503 zurück.")
        return None

    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    logger.info("Supabase-Admin-Client erstellt.")
    return client

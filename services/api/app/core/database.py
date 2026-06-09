"""
Datenbankverbindung für EchoB.

- asyncpg: direkter Postgres-Zugang für eigene Tabellen (Warteliste, Cases, etc.)
- Supabase: Auth-Validierung (JWT) und zukünftig Storage/Realtime
"""
import asyncpg
from supabase import create_client, Client as SupabaseClient

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# asyncpg Connection Pool
# ---------------------------------------------------------------------------

def _asyncpg_dsn(url: str) -> str:
    """Konvertiert SQLAlchemy-DSN-Format zu nativem asyncpg-Format."""
    return url.replace("postgresql+asyncpg://", "postgresql://")


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
    logger.info("asyncpg-Verbindungspool erstellt (min=2, max=10).")
    return pool


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

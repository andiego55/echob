"""
Datenbankverbindung für EchoB – asyncpg Connection Pool.

Phase 0: direkter asyncpg-Zugang (kein ORM, kein Supabase-Client).
Phase 1+: Supabase-Client hinzufügen (siehe Kommentare unten).

Der Pool lebt auf app.state.pool und wird im Lifespan (main.py) erstellt
und geschlossen. Routen erhalten ihn per Depends(get_pool).
"""
import asyncpg

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

def _asyncpg_dsn(url: str) -> str:
    """
    Konvertiert SQLAlchemy-DSN-Format zu nativem asyncpg-Format.

    SQLAlchemy:  postgresql+asyncpg://user:pass@host/db
    asyncpg:     postgresql://user:pass@host/db
    """
    return url.replace("postgresql+asyncpg://", "postgresql://")


# ---------------------------------------------------------------------------
# Pool-Lifecycle (wird vom Lifespan in main.py gesteuert)
# ---------------------------------------------------------------------------

async def create_pool() -> asyncpg.Pool | None:
    """
    Erstellt den asyncpg-Verbindungspool.

    Gibt None zurück wenn DATABASE_URL nicht gesetzt ist (z. B. in Tests
    ohne echte Datenbank). In diesem Fall bleibt app.state.pool == None
    und get_pool() wirft einen 503-Fehler.
    """
    if not settings.database_url:
        logger.warning(
            "DATABASE_URL nicht gesetzt – asyncpg-Pool wird nicht erstellt. "
            "Alle DB-Endpunkte antworten mit 503."
        )
        return None

    dsn = _asyncpg_dsn(settings.database_url)
    pool = await asyncpg.create_pool(
        dsn,
        min_size=2,
        max_size=10,
        command_timeout=30,
    )
    logger.info("asyncpg-Verbindungspool erstellt (min=2, max=10).")
    return pool


# ---------------------------------------------------------------------------
# Supabase Client (ab Phase 1)
# ---------------------------------------------------------------------------
# from supabase import create_client, Client
#
# def get_supabase() -> Client:
#     """Supabase-Client mit anon-Key (Row-Level Security aktiv)."""
#     return create_client(settings.supabase_url, settings.supabase_anon_key)
#
# def get_supabase_admin() -> Client:
#     """Service-Role-Client für privilegierte Operationen (kein RLS)."""
#     return create_client(settings.supabase_url, settings.supabase_service_role_key)
# ---------------------------------------------------------------------------

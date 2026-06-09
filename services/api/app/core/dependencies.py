"""
FastAPI Dependencies für EchoB.

Werden per `Depends()` in Routen injiziert.

Aktuell: Platzhalter.
Phase 1: Supabase-JWT-Validierung aktivieren.
"""
import asyncpg
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.logging import get_logger

logger = get_logger(__name__)

# OAuth2-Bearer-Schema für Swagger-UI
bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Datenbank-Dependency
# ---------------------------------------------------------------------------

def get_pool(request: Request) -> asyncpg.Pool:
    """
    Gibt den asyncpg-Verbindungspool aus app.state zurück.

    Nutzung in Routen:
        pool: asyncpg.Pool = Depends(get_pool)

    Wirft 503 wenn der Pool nicht initialisiert ist (DATABASE_URL fehlt).
    In Tests per dependency_overrides überschreiben.
    """
    pool = getattr(request.app.state, "pool", None)
    if pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Datenbankverbindung nicht verfügbar.",
        )
    return pool


# ---------------------------------------------------------------------------
# Auth Dependency (Phase 1: Supabase JWT)
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """
    Validiert den Supabase-JWT-Token aus dem Authorization-Header.

    Platzhalter – gibt aktuell einen Dummy-User zurück.
    In Phase 1 ersetzen durch:

        from supabase import Client
        supabase = get_supabase_admin()
        user = supabase.auth.get_user(credentials.credentials)
        return user.user
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kein Authentifizierungstoken angegeben.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Sicherheitsguard: In Production darf der Platzhalter nie aktiv sein.
    # Phase 1: Diesen Block durch echte Supabase-JWT-Validierung ersetzen.
    from app.core.config import settings
    if settings.is_production:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Authentifizierung noch nicht implementiert.",
        )

    logger.debug("Auth-Dependency aufgerufen – Platzhalter aktiv (nur Dev)")
    return {"user_id": "placeholder", "token": credentials.credentials}


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict | None:
    """
    Wie get_current_user, aber ohne Fehler wenn kein Token vorhanden.
    Für Endpunkte, die sowohl anonym als auch authentifiziert funktionieren.
    """
    if credentials is None:
        return None
    return await get_current_user(credentials)

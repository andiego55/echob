"""
FastAPI Dependencies für EchoB.
Werden per `Depends()` in Routen injiziert.
"""
import asyncpg
from supabase import Client as SupabaseClient
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.logging import get_logger

logger = get_logger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Datenbank-Dependency
# ---------------------------------------------------------------------------

def get_pool(request: Request) -> asyncpg.Pool:
    """Gibt den asyncpg-Pool aus app.state zurück."""
    pool = getattr(request.app.state, "pool", None)
    if pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Datenbankverbindung nicht verfügbar.",
        )
    return pool


# ---------------------------------------------------------------------------
# Supabase-Dependency
# ---------------------------------------------------------------------------

def get_supabase(request: Request) -> SupabaseClient:
    """Gibt den Supabase-Admin-Client aus app.state zurück."""
    client = getattr(request.app.state, "supabase", None)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth-Dienst nicht verfügbar.",
        )
    return client


# ---------------------------------------------------------------------------
# Auth Dependencies
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    supabase: SupabaseClient = Depends(get_supabase),
) -> dict:
    """
    Validiert den Supabase-JWT aus dem Authorization-Header.
    Gibt das User-Objekt zurück: { user_id, email, role }

    Wirft 401 bei fehlendem oder ungültigem Token.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kein Authentifizierungstoken angegeben.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        response = supabase.auth.get_user(credentials.credentials)
        user = response.user
        if user is None:
            raise ValueError("Kein User im Token")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger oder abgelaufener Token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "user_id": user.id,
        "email":   user.email,
        "role":    user.role,
    }


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    supabase: SupabaseClient = Depends(get_supabase),
) -> dict | None:
    """
    Wie get_current_user, aber ohne Fehler wenn kein Token vorhanden.
    Für Endpunkte die sowohl anonym als auch authentifiziert funktionieren.
    """
    if credentials is None:
        return None
    try:
        response = supabase.auth.get_user(credentials.credentials)
        user = response.user
        if user is None:
            return None
        return {"user_id": user.id, "email": user.email, "role": user.role}
    except Exception:
        return None

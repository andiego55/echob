from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import create_pool, create_supabase_admin
from app.core.logging import get_logger, setup_logging
from app.api.v1.router import v1_router
from app.services.echo_service import create_echo_service


def _create_echo_service():
    key = getattr(settings, "openai_api_key", "")
    return create_echo_service(openai_api_key=key)

logger = get_logger(__name__)


def create_app() -> FastAPI:
    """
    App Factory – erstellt und konfiguriert die FastAPI-Instanz.

    Vorteile gegenüber einem Modul-Level-`app`:
    - Testbar: Tests können create_app() mit dependency_overrides aufrufen.
    - Klar: Initialisierungsreihenfolge ist explizit.
    - Erweiterbar: Lifespan-Events, Plugins etc. zentral hier.
    """
    setup_logging()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # ── Startup ─────────────────────────────────────────────────────
        app.state.pool        = await create_pool()
        app.state.supabase    = create_supabase_admin()
        app.state.echo_service = _create_echo_service()
        yield
        # ── Shutdown ─────────────────────────────────────────────────────
        if app.state.pool is not None:
            await app.state.pool.close()
            logger.info("asyncpg-Pool geschlossen.")

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "EchoB API – Backend für die EchoB-Reflexionsplattform.\n\n"
            "**Hinweis:** EchoB ersetzt keine Psychotherapie, "
            "keine medizinische Diagnostik und keine Notfallhilfe."
        ),
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Globaler Exception-Handler ───────────────────────────────────────
    # Verhindert, dass interne Stacktraces (asyncpg, DB-Fehler etc.)
    # in der HTTP-Response landen.
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            f"Unbehandelter Fehler: {type(exc).__name__} – {request.method} {request.url.path}",
            exc_info=exc,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Interner Serverfehler."},
        )

    @app.exception_handler(asyncpg.PostgresError)
    async def postgres_error_handler(request: Request, exc: asyncpg.PostgresError) -> JSONResponse:
        logger.error(
            f"Datenbankfehler: {type(exc).__name__} – {request.method} {request.url.path}",
            exc_info=exc,
        )
        return JSONResponse(
            status_code=503,
            content={"detail": "Datenbankfehler. Bitte versuche es erneut."},
        )

    # ── CORS ────────────────────────────────────────────────────────────
    allow_methods = ["GET", "POST"] if settings.is_production else ["*"]
    allow_headers = ["Content-Type", "Authorization"] if settings.is_production else ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=allow_methods,
        allow_headers=allow_headers,
    )

    # ── Router ──────────────────────────────────────────────────────────
    app.include_router(v1_router, prefix="/api/v1")

    return app


# Einstiegspunkt für uvicorn:
# uvicorn app.main:app --reload
app = create_app()

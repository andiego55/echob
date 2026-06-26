from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import v1_router
from app.core.config import settings
from app.core.database import create_pool, create_supabase_admin
from app.core.logging import get_logger, setup_logging
from app.services.echo_service import create_echo_service


def _create_echo_service():
    key = getattr(settings, "openai_api_key", "")
    # „Leichter Switch": echo_models_use_gpt4o → alles zurück auf gpt-4o(-mini),
    # klassischer Modus (max_tokens + temperature). Sonst gpt-5.x = Reasoning-Modus.
    if settings.echo_models_use_gpt4o:
        smart, fast, reasoning = "gpt-4o", "gpt-4o-mini", False
    else:
        smart, fast, reasoning = settings.echo_model_smart, settings.echo_model_fast, True
    return create_echo_service(
        openai_api_key=key,
        model_smart=smart,
        model_fast=fast,
        model_whisper=settings.echo_model_whisper,
        reasoning=reasoning,
        reasoning_effort=settings.echo_reasoning_effort,
        reasoning_headroom=settings.echo_reasoning_headroom,
    )

logger = get_logger(__name__)


def _scrub_event(event: dict, _hint: dict) -> dict | None:
    """Entfernt potenziell sensible Felder, bevor ein Event an Sentry geht."""
    req = event.get("request")
    if isinstance(req, dict):
        req.pop("data", None)  # kein Request-Body (kann Fallinhalte enthalten)
        headers = req.get("headers")
        if isinstance(headers, dict):
            for h in ("authorization", "Authorization", "cookie", "Cookie"):
                headers.pop(h, None)
    return event


def _init_sentry() -> None:
    """Error-Monitoring (nur wenn DSN gesetzt). Bewusst PII-frei: keine lokalen
    Variablen (könnten entschlüsselte Inhalte enthalten), kein Request-Body."""
    if not settings.sentry_dsn:
        return
    try:
        import sentry_sdk
    except ImportError:
        logger.warning("sentry-sdk nicht installiert – Monitoring deaktiviert.")
        return
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        send_default_pii=False,
        include_local_variables=False,
        max_request_body_size="never",
        traces_sample_rate=0.0,
        before_send=_scrub_event,
    )
    logger.info("Sentry-Monitoring aktiv (environment=%s).", settings.environment)


def create_app() -> FastAPI:
    """
    App Factory – erstellt und konfiguriert die FastAPI-Instanz.

    Vorteile gegenüber einem Modul-Level-`app`:
    - Testbar: Tests können create_app() mit dependency_overrides aufrufen.
    - Klar: Initialisierungsreihenfolge ist explizit.
    - Erweiterbar: Lifespan-Events, Plugins etc. zentral hier.
    """
    setup_logging()
    _init_sentry()

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
    # PUT/PATCH/DELETE werden von Profil-, Szenen- und Session-Endpoints genutzt
    allow_methods = (
        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
        if settings.is_production
        else ["*"]
    )
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

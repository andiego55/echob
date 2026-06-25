from typing import Annotated, Literal

from pydantic import BeforeValidator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_comma_list(v: str | list) -> list[str]:
    """
    Parst kommagetrennte Strings aus .env zu einer Liste.
    Erlaubt beide Formate:
        CORS_ORIGINS=http://a.com,http://b.com          ← .env
        CORS_ORIGINS='["http://a.com","http://b.com"]'  ← docker-compose (JSON)
    """
    if isinstance(v, str):
        # JSON-Array-Format (pydantic-settings parst es selbst zu list – hier
        # kommt nur ein String an wenn es kein gültiges JSON ist)
        return [item.strip() for item in v.split(",") if item.strip()]
    return v


CommaSeparatedList = Annotated[list[str], BeforeValidator(_parse_comma_list)]

_INSECURE_KEY = "insecure-dev-secret-change-in-production"


class Settings(BaseSettings):
    # ── Meta ───────────────────────────────────────────────────────────
    app_name: str = "EchoB API"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"

    # ── CORS ───────────────────────────────────────────────────────────
    cors_origins: CommaSeparatedList = ["http://localhost:5173", "http://localhost:3000"]

    # ── Supabase ───────────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # ── Datenbank ──────────────────────────────────────────────────────
    database_url: str = ""

    # ── Auth / Sicherheit ──────────────────────────────────────────────
    secret_key: str = _INSECURE_KEY
    # Feldverschlüsselung sensibler Freitexte (Art. 32). Fernet-Key (urlsafe-base64).
    # Leer = aus (Klartext). Verlust des Keys = Datenverlust → sicher verwahren + sichern!
    encryption_key: str = ""

    # ── AI ─────────────────────────────────────────────────────────────
    openai_api_key: str = ""
    anthropic_api_key: str = ""   # Reserviert für zukünftige Nutzung
    # Kostenschutz Entwicklungsphase (0 = jeweils unbegrenzt):
    echo_prompt_limit: int = 250   # max. Echo-Nachrichten pro Nutzer
    report_limit: int = 20         # max. Berichts-Generierungen pro Nutzer
    scale_calc_limit: int = 20     # max. Skalen-Berechnungen pro Nutzer

    # ── Stripe (Zahlungen) ─────────────────────────────────────────────
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    # Optional: feste Price-IDs aus dem Stripe-Dashboard.
    # Wenn leer, werden Preise inline (price_data) erzeugt — kein Setup nötig.
    stripe_price_early_bird: str = ""
    stripe_price_regular: str = ""
    stripe_price_annual: str = ""
    # Org-Tarife (Praxis) — optional, sonst inline
    stripe_price_pro_solo: str = ""
    stripe_price_pro_praxis: str = ""
    stripe_price_pro_institut: str = ""
    # Basis-URL des Frontends für Checkout-Redirects
    frontend_url: str = "http://localhost:5173"

    # ── Monitoring (Sentry) ────────────────────────────────────────────
    # Leer = aus. PII-frei konfiguriert (siehe main.py). EU-Region empfohlen.
    sentry_dsn: str = ""

    # ── Logging ────────────────────────────────────────────────────────
    log_level: Literal["debug", "info", "warning", "error"] = "info"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Computed Properties ────────────────────────────────────────────

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    # ── Startup-Validierung ────────────────────────────────────────────

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Bricht den Start ab wenn unsichere Defaults in Production laufen."""
        if not self.is_production:
            return self

        errors: list[str] = []

        if self.secret_key in ("", _INSECURE_KEY):
            errors.append("SECRET_KEY muss in Production gesetzt sein.")

        if not self.cors_origins or any(
            "localhost" in o for o in self.cors_origins
        ):
            errors.append(
                "CORS_ORIGINS enthält localhost – in Production nicht erlaubt."
            )

        if errors:
            raise ValueError("Unsichere Konfiguration für Production:\n" + "\n".join(f"  • {e}" for e in errors))

        return self


# Singleton – einmal instanziieren, überall importieren:
# from app.core.config import settings
settings = Settings()

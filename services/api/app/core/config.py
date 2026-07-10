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

# Fester Fernet-Schlüssel NUR für Development/Tests: sorgt dafür, dass auch lokal
# IMMER verschlüsselt wird — sensible Freitexte liegen nie versehentlich im Klartext.
# Kein Geheimnis (gilt nur für Wegwerf-Dev-Daten); in Production wird ein ECHTER
# Key erzwungen (siehe validate_production_secrets). Nicht für echte Daten verwenden.
_DEV_ENCRYPTION_KEY = "OfenbMY_hx9Ic8WK0Wn_TMPU_8zLZFHzkN2LZ-Z4z8o="


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

    # ── KI-Modelle (OpenAI) ────────────────────────────────────────────
    # Reporte + Skalen nutzen das „smarte" Modell, Chat + alles andere das
    # „schnelle". Leichter Notausstieg: echo_models_use_gpt4o=true → alles auf
    # gpt-4o / gpt-4o-mini (bewährt). Exakte Modell-IDs gegen OpenAI prüfen.
    echo_model_smart: str = "gpt-5.4"        # Reporte + Skalen
    echo_model_fast: str = "gpt-5.4-mini"    # Chat + alles andere (inkl. Triage)
    echo_model_whisper: str = "whisper-1"    # Audio-Transkription
    echo_models_use_gpt4o: bool = False      # Switch → alles zurück auf gpt-4o
    echo_reasoning_effort: str = "low"       # gpt-5.x: low/medium/high
    echo_reasoning_headroom: int = 4000      # Extra-Token-Obergrenze fürs Reasoning
    anthropic_api_key: str = ""   # Reserviert für zukünftige Nutzung
    # Kostenschutz Entwicklungsphase (0 = jeweils unbegrenzt):
    echo_prompt_limit: int = 250          # max. Echo-Nachrichten pro Nutzer (gesamt)
    echo_prompt_daily_limit: int = 120    # harter Tages-Deckel Echo-Nachrichten/Nutzer
    report_limit: int = 10         # max. Berichts-Generierungen pro Nutzer/Monat
    scale_calc_limit: int = 10     # max. Skalen-Analysen pro Nutzer/Monat
    # Harter Deckel der kostenlosen Spielwiese (Demo-Fälle), pro Fachperson:
    demo_echo_limit: int = 30      # max. Echo-Nachrichten auf Demo-Fällen (gesamt)
    demo_report_limit: int = 6     # max. Berichte pro Demo-Fall (inkl. Beispielbericht)

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

    # ── Lead-Benachrichtigung (Resend) ─────────────────────────────────
    # Leer = kein Mailversand (Leads werden trotzdem in der DB gespeichert).
    resend_api_key: str = ""
    lead_notify_to: str = "kontakt@echo-b.de"     # Empfänger der Lead-Mails
    # Absender != Empfänger → weniger „an mich selbst"-Spam-Verdacht (M365).
    # leads@echo-b.de braucht kein Postfach, nur die verifizierte Resend-Domain.
    lead_from_email: str = "leads@echo-b.de"

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
        """Erzwingt sichere Konfiguration. Development: setzt einen festen Dev-Key,
        damit IMMER verschlüsselt wird. Production: bricht bei unsicheren Defaults ab
        (fail-closed) – u.a. wenn KEIN ENCRYPTION_KEY gesetzt ist, sonst würden
        sensible Freitexte im Klartext gespeichert."""
        # Nur Development/Tests: nie versehentlich Klartext → fester Dev-Key, wenn
        # keiner gesetzt ist. Staging/Production bekommen den öffentlichen Dev-Key
        # NICHT (dort muss ein echter Key gesetzt sein).
        if self.is_development and not self.encryption_key:
            self.encryption_key = _DEV_ENCRYPTION_KEY

        if self.is_production:
            errors: list[str] = []

            if self.secret_key in ("", _INSECURE_KEY):
                errors.append("SECRET_KEY muss in Production gesetzt sein.")

            if not self.encryption_key:
                errors.append(
                    "ENCRYPTION_KEY muss in Production gesetzt sein – ohne ihn "
                    "würden sensible Daten im Klartext gespeichert (fail-closed)."
                )

            if not self.cors_origins or any(
                "localhost" in o for o in self.cors_origins
            ):
                errors.append(
                    "CORS_ORIGINS enthält localhost – in Production nicht erlaubt."
                )

            if errors:
                raise ValueError(
                    "Unsichere Konfiguration für Production:\n"
                    + "\n".join(f"  • {e}" for e in errors)
                )

        # Key-Format früh prüfen (Dev + Prod): fängt einen kaputten/vertippten
        # Schlüssel beim Start ab, statt erst zur Laufzeit stumm zu scheitern.
        if self.encryption_key:
            from cryptography.fernet import Fernet
            try:
                Fernet(self.encryption_key.encode("ascii"))
            except Exception as e:  # noqa: BLE001 – jede Fehlform soll den Start stoppen
                raise ValueError(
                    f"ENCRYPTION_KEY ist kein gültiger Fernet-Schlüssel: {e}"
                ) from e

        return self


# Singleton – einmal instanziieren, überall importieren:
# from app.core.config import settings
settings = Settings()

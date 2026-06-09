# EchoB API

Python/FastAPI-Backend für EchoB.

## Struktur

```
app/
  main.py               ← App Factory (create_app) + uvicorn-Einstiegspunkt
  api/
    v1/
      router.py         ← Zentraler v1-Router, registriert alle Sub-Router
      routers/
        health.py       ← GET /api/v1/health
        waitlist.py     ← POST /api/v1/waitlist
  core/
    config.py           ← pydantic-settings (Settings-Klasse, .env-Laden)
    database.py         ← Supabase-Client (Platzhalter, ab Phase 1 aktiv)
    logging.py          ← strukturiertes Logging
    dependencies.py     ← FastAPI Depends: get_current_user()
  schemas/
    common.py           ← HealthResponse, MessageResponse
    waitlist.py         ← WaitlistCreateRequest/Response
    user.py             ← UserPublic, CurrentUserResponse
  services/
    waitlist_service.py ← Business Logic Waitlist (kein HTTP)
  tests/
    test_health.py      ← Smoke-Tests: Health + Waitlist
```

## Lokal starten

```bash
cd services/api

# Virtuelle Umgebung
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

# Dependencies
pip install -e ".[dev]"

# .env anlegen
cp .env.example .env

# Server starten
uvicorn app.main:app --reload --port 8000
```

- Healthcheck:    http://localhost:8000/api/v1/health
- Swagger UI:     http://localhost:8000/docs
- ReDoc:          http://localhost:8000/redoc

## Tests

```bash
pytest
```

## Neuen Router hinzufügen

1. Neue Datei in `app/api/v1/routers/mein_bereich.py` anlegen
2. `router = APIRouter()` und Endpunkte definieren
3. In `app/api/v1/router.py` importieren und mit `v1_router.include_router()` registrieren
4. Schema in `app/schemas/mein_bereich.py`, Business Logic in `app/services/mein_bereich_service.py`

## Phasenplan

| Phase | Neue Router / Features                              |
|-------|-----------------------------------------------------|
| 0     | health, waitlist ✅                                  |
| 1     | onboarding, auth (Supabase JWT), Datenbank-Layer    |
| 2     | cases, events, me (Nutzerprofil)                    |
| 3     | chat (Anthropic Claude), patterns                   |
| 4     | reports, PDF-Export (WeasyPrint), Worker (ARQ)      |
| 5     | Fachpersonenbereich                                 |

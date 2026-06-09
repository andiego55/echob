# EchoB API

Python/FastAPI-Backend für EchoB.

## Status

Minimaler Platzhalter mit Healthcheck. Vollständige Implementierung folgt in Phase 1.

## Starten

```bash
cd services/api

# Virtuelle Umgebung anlegen
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

# Dependencies installieren
pip install -e ".[dev]"

# Umgebungsvariablen setzen
cp .env.example .env

# Server starten
uvicorn app.main:app --reload --port 8000
```

Healthcheck: http://localhost:8000/health

API-Dokumentation (Swagger): http://localhost:8000/docs

## Geplante Endpunkte

Siehe `docs/architecture.md` für die vollständige Liste.

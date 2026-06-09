# EchoB Worker

Python-Worker für Hintergrundjobs.

## Status

Platzhalter. Implementierung folgt in Phase 4.

## Geplante Jobs

- Report-Generierung (PDF via WeasyPrint)
- Musterklassifikation (AI-Auswertung)
- Skalen-Neuberechnung
- Datenexporte (DSGVO)
- Coaching-Lead-Benachrichtigungen

## Geplante Technologie

- ARQ (asyncio-Task-Queue)
- Redis als Queue-Backend
- Upstash Redis (managed, serverless) für Production

## Starten (sobald implementiert)

```bash
cd services/worker
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
python -m app.main
```

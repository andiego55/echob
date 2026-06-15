# EchoB

**EchoB** ist eine deutschsprachige Plattform für Menschen in belastenden, schwer einzuordnenden Beziehungssituationen.

EchoB hilft dabei:
- belastende Situationen zu sortieren
- wiederkehrende Beziehungsmuster sichtbar zu machen
- Beobachtung, Gefühl und Interpretation besser zu trennen
- die eigene Wahrnehmung zu stabilisieren
- nächste Schritte klarer zu sehen
- Coaching, Beratung oder Therapie besser vorzubereiten

**EchoB ist keine Diagnose-App, keine Therapie-App und keine Notfallhilfe.**

---

## Status

EchoB ist **live** und in aktiver Entwicklung:
- **Frontend** auf Cloudflare Pages (Auto-Deploy bei Push auf `main`)
- **API + Postgres** auf Hetzner (Docker Compose)
- **Auth** über Supabase · **KI** über OpenAI (GPT-4o / Whisper) · **Zahlungen** über Stripe

Deployment: siehe [`DEPLOY.md`](DEPLOY.md).

---

## Funktionen

- **Fälle & Szenen** — belastende Situationen dokumentieren; Schnellerfassung per Sprache oder Text (Whisper-Transkription + KI-Strukturierung)
- **Echo** — KI-Dialog mit vollem Fallkontext: freier Chat, Themendialoge, Hypothesen-Dialoge
- **Hypothesen** — tastende Arbeitshypothesen zu Dynamik, Persönlichkeitsstruktur (Cluster-B), Bindung, Trauma und eigenem Anteil — ausdrücklich keine Diagnosen
- **Muster & Skalen** — 15 Skalen, aus den dokumentierten Szenen geschätzt
- **Verlauf / Rückblick** — Trends über die Zeit plus narrativer Rückblick
- **Berichte** — strukturierte Auswertungen; druckbare Fall-Zusammenfassung (PDF) zum Mitnehmen
- **Fachpersonenbereich** — gezielte Freigabe einzelner Inhalte an registrierte Fachpersonen; deren Echo arbeitet ausschließlich mit dem Freigegebenen
- **Sicherheit & Diskretion** — aktive Krisenerkennung im Dialog (DACH-Hotlines), PIN-Sperre und Schnell-Verlassen

---

## Struktur

```
echob/
  static-site/        → Statische Marketing-Website (HTML/CSS, Nginx)
  apps/
    web/              → React-Frontend (Vite, TypeScript, Tailwind, React Query)
  services/
    api/              → Python/FastAPI-Backend (asyncpg, Supabase-Auth, OpenAI)
    worker/           → Python-Worker für Hintergrundjobs (Platzhalter)
  docs/               → Architektur- und Produktdokumentation
  infra/              → Docker, Postgres-Init-SQL, Deployment
```

---

## Lokale Entwicklung

```bash
# 1. Einmalig: .env.docker anlegen
cp .env.docker.example .env.docker

# 2. Backend-Stack starten (API + Postgres + Static Site)
docker compose up -d --build

# 3. Frontend (React) separat im Dev-Modus
npm --prefix apps/web run dev
```

| Service          | URL                        |
|------------------|----------------------------|
| Frontend (Vite)  | http://localhost:5173      |
| API              | http://localhost:8000      |
| API Docs         | http://localhost:8000/docs |
| Static Site      | http://localhost:8080      |
| Postgres         | localhost:5432             |

Hot-Reload ist aktiv: Änderungen in `services/api/app/` werden sofort übernommen.

Weitere Details: [`infra/docker/README.md`](infra/docker/README.md)

---

## Bereiche

| Bereich        | Technologie                           | Status      |
|----------------|---------------------------------------|-------------|
| React-Frontend | React, Vite, TypeScript, Tailwind     | live        |
| API-Backend    | Python, FastAPI, asyncpg              | live        |
| Datenbank      | Postgres (Hetzner) · Auth: Supabase   | live        |
| KI             | OpenAI GPT-4o / Whisper               | live        |
| Zahlungen      | Stripe                                | live        |
| Statische Site | HTML/CSS, Nginx                       | live        |
| Worker         | Python                                | Platzhalter |
| Hosting        | Cloudflare Pages (FE) · Hetzner (API) | live        |

---

## Dokumentation

- [`DEPLOY.md`](DEPLOY.md) – Production-Deployment (Hetzner, Cloudflare)
- [`services/api/app/prompts/PROMPTS.md`](services/api/app/prompts/PROMPTS.md) – Übersicht aller Echo-Prompts
- [`docs/architecture.md`](docs/architecture.md) – Zielarchitektur
- [`docs/product-principles.md`](docs/product-principles.md) – Produktprinzipien
- [`docs/safety-and-claims.md`](docs/safety-and-claims.md) – Erlaubte und nicht erlaubte Claims

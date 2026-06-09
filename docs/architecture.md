# EchoB – Zielarchitektur

---

## Übersicht

```
Browser
  │
  ├── static-site/          → Statisches HTML (Cloudflare Pages o. ä.)
  │
  └── apps/web              → React-SPA (Cloudflare Pages o. ä.)
        │
        └── services/api    → FastAPI-Backend (Render / Fly.io / Hetzner)
              │
              ├── Supabase (Postgres + Auth + Storage)
              └── services/worker  → Hintergrundjobs (ARQ + Redis)
```

---

## Frontend: `apps/web`

- **Technologie:** React, TypeScript, Vite (vorläufig; Next.js offen)
- **Styling:** Tailwind CSS
- **Routing:** React Router v6 (oder Next.js App Router)
- **API-Kommunikation:** Fetch-basierter API-Client gegen `services/api`
- **Auth:** Supabase Auth (JWT-Token, serverseitig validiert)

**Seiten (geplant):**
- Marketingseiten (Index, App-Info, Coaching, Wissen, Fachpersonen)
- Onboarding-Flow
- Dashboard (eingeloggte Nutzende)
- Ereignisprotokoll
- Musterübersicht
- Report-Ansicht

---

## Backend: `services/api`

- **Technologie:** Python 3.12+, FastAPI
- **Datenbankzugang:** Supabase (via `supabase-py` oder direktes `asyncpg`)
- **Auth-Validierung:** Supabase JWT-Tokens
- **Struktur:**

```
app/
  main.py          → FastAPI-App-Instanz, Middleware, Routen-Registrierung
  api/
    v1/            → Versionierte Routen
  core/            → Settings, Logging, Datenbankverbindung
  schemas/         → Pydantic-Schemas (Request / Response)
  services/        → Business-Logik (getrennt von HTTP-Layer)
```

**Geplante Endpunkte (Phase 1–5):**
- `POST /onboarding` – Erstregistrierung
- `POST /waitlist` – Warteliste
- `POST /cases` – Nutzerfälle anlegen
- `POST /events` – Ereignisse speichern
- `GET /patterns` – Muster abrufen
- `POST /chat` – Reflexionsdialog (AI)
- `GET /reports/{id}` – Reports abrufen
- `POST /coaching-leads` – Coaching-Anfragen

---

## Worker: `services/worker`

- **Technologie:** Python 3.12+, ARQ (asyncio-Task-Queue), Redis
- **Zweck:** Zeitintensive Hintergrundjobs, die nicht im Request-Kontext laufen

**Geplante Jobs:**
- Report-Erstellung (PDF via WeasyPrint)
- Musterklassifikation (AI-Auswertung)
- Skalen-Neuberechnung
- Datenexporte
- Coaching-Lead-Benachrichtigungen

---

## Daten: Supabase / Postgres

- **Datenbank:** Postgres (via Supabase)
- **Auth:** Supabase Auth (Email, ggf. OAuth)
- **Storage:** Supabase Storage (für Reports, PDFs)
- **Sicherheit:**
  - Row-Level Security (RLS) für alle Nutzerdaten
  - Nutzerdaten sind ausschließlich für den jeweiligen Account sichtbar
  - Lösch- und Exportfunktionen (DSGVO) von Beginn an eingeplant
- **Sensible Daten:** Ereignistexte, Chatverläufe, Skalenwerte, Reports

---

## Deployment (geplant)

| Komponente      | Hosting-Option               | Status    |
|-----------------|------------------------------|-----------|
| `static-site`   | Cloudflare Pages             | sofort    |
| `apps/web`      | Cloudflare Pages / Vercel    | Phase 1   |
| `services/api`  | Render / Fly.io / Railway    | Phase 1   |
| `services/worker`| Render Background Worker    | Phase 4   |
| Datenbank       | Supabase (managed Postgres)  | Phase 1   |
| Redis           | Upstash (serverless Redis)   | Phase 4   |

---

## Sicherheitsüberlegungen

- Alle API-Requests über HTTPS
- CORS: nur bekannte Domains
- Keine Klardaten-Speicherung von Passwörtern (Supabase Auth)
- Datenschutz-by-design: minimale Datenerhebung, RLS, DSGVO-Werkzeuge
- AI-Prompts enthalten keine personenbezogenen Daten im System-Prompt

# EchoB – Projektnotizen & Architekturentscheidungen

---

## Getroffene Entscheidungen

### Monorepo

Das Projekt wird als Monorepo geführt, da Frontend, Backend und Worker inhaltlich eng zusammenhängen.
Gemeinsame Typen, Schemas und Dokumentation lassen sich so zentral verwalten.
Es wird kein Monorepo-Framework (Nx, Turborepo) eingesetzt – die Struktur bleibt zunächst einfach.

### Frontend und Backend getrennt

React-Frontend (`apps/web`) und Python-Backend (`services/api`) sind bewusst getrennt:

- Unterschiedliche Deployment-Zyklen: das Frontend kann auf Cloudflare Pages liegen, das Backend auf einem eigenen Server.
- Unterschiedliche Sprachen und Toolchains.
- Klare Grenze: das Frontend kommuniziert ausschließlich über eine REST-API mit dem Backend.
- Einfacheres Caching, CDN-Nutzung und CORS-Kontrolle.

### Warum `static-site/` zusätzlich zu `apps/web`?

`static-site/` ermöglicht es, sehr schnell eine funktionierende Website zu haben, ohne dass React gebaut, konfiguriert oder deployed werden muss.

Konkrete Vorteile:
- Sofort mit Cloudflare Pages, Netlify Drop oder jedem statischen Hoster deploybar.
- Kein Node.js, kein Build-Schritt, kein npm install.
- Gut für frühe Warteliste, Onboarding-Prototyp und Landingpages.
- Kann schrittweise durch die React-App abgelöst werden.

### Python für Backend und Worker

FastAPI ist performant, modern und hat gute Unterstützung für asynchrone Operationen.
Python ist wegen der AI/ML-Bibliotheken (LangChain, OpenAI SDK, Pandas, etc.) die natürliche Wahl für Backend und Worker.

---

## Nächste sinnvolle technische Schritte

1. `static-site/warteliste.html` – Formular anschließen (z. B. Formspree, Tally, oder eigenes Endpoint)
2. FastAPI-Backend lokal starten und Healthcheck testen
3. Entscheidung: Vite oder Next.js für `apps/web` (siehe unten)
4. Supabase-Projekt anlegen und `.env`-Dateien befüllen
5. Cloudflare Pages für `static-site/` einrichten
6. CI/CD-Grundstruktur (GitHub Actions) anlegen

---

## Offene Entscheidungen

### Vite oder Next.js?

| Kriterium            | Vite + React Router | Next.js              |
|----------------------|---------------------|----------------------|
| Einfachheit          | ✅ sehr einfach      | ⚠️ mehr Konventionen |
| SSR / SEO            | ❌ nein (SPA)        | ✅ ja                 |
| File-based Routing   | ❌ manuell           | ✅ eingebaut          |
| Deployment           | einfach (static)    | Vercel / Cloudflare  |
| Lernkurve            | niedrig             | mittel               |

**Empfehlung für Phase 1:** Vite + React Router, da die App primär ein eingeloggter Bereich ist.  
Marketingseiten können weiterhin statisch bleiben. Next.js kann später evaluiert werden.

### Auth-Anbieter?

| Option       | Vorteile                        | Nachteile                        |
|--------------|---------------------------------|----------------------------------|
| Supabase Auth| Sehr einfach, gratis, Postgres  | Vendor Lock-in                   |
| Clerk        | Beste DX, schöne UI-Komponenten | Kosten bei Scale                 |
| Auth.js      | Open Source, selbst gehostet    | mehr Setup                       |

**Empfehlung:** Supabase Auth als Einstieg, da Supabase sowieso als Datenbank geplant ist.

### Backend-Hosting?

Optionen: Render, Fly.io, Railway, Hetzner VPS, DigitalOcean.  
**Empfehlung:** Render oder Railway für den Einstieg (einfaches Deployment per Git-Push).  
Bei Wachstum: Hetzner VPS mit Docker für mehr Kontrolle und günstigere Kosten.

### Reporting-Worker-Architektur?

Optionen: Celery + Redis, ARQ (async), einfache Cronjobs, Supabase Edge Functions.  
**Empfehlung für Phase 4:** ARQ (asyncio-nativ, einfacher als Celery) mit Redis als Queue.

### PDF-Generierung?

Optionen: WeasyPrint, ReportLab, Playwright (headless Chromium), wkhtmltopdf.  
**Empfehlung:** WeasyPrint – Python-nativ, CSS-basiertes Layout, keine Browser-Abhängigkeit.

### AI-Provider?

Optionen: OpenAI (GPT-4o), Anthropic (Claude), Mistral (selbst hostbar), lokale Modelle.  
**Empfehlung:** Anthropic Claude als Primär-Provider für den Reflexionsdialog.  
Begründung: bessere Qualität bei einfühlsamen, nicht-diagnostischen Texten; starke System-Prompt-Kontrolle.

---

## Nicht getroffene Entscheidungen (bewusst offen gelassen)

- Datenmodell (Tabellen, Schemas) – folgt in Phase 1
- Skalierung und Caching-Strategie – folgt bei Bedarf
- Mobile App – nicht geplant, aber PWA wäre möglich
- Zahlungsmodell / Subscription – noch nicht entschieden

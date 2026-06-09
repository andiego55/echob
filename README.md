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

> Dieses Repository ist aktuell ein Projektgerüst. Es enthält Platzhalter und minimalen Code.  
> Produktiver Code folgt schrittweise.

---

## Struktur

```
echob/
  static-site/        → Sofort hostbare statische HTML-Seiten (kein Build nötig)
  apps/
    web/              → React-Frontend (später)
  services/
    api/              → Python/FastAPI-Backend (später)
    worker/           → Python-Worker für Hintergrundjobs (später)
  packages/
    shared/           → Gemeinsame Schemas und Typen (später)
  docs/               → Architektur- und Produktdokumentation
  infra/              → Infrastruktur und Deployment
```

---

## Statische Website lokal öffnen

Die statische Website benötigt kein Build-System und keine Dependencies.

```
static-site/index.html → im Browser per Doppelklick öffnen
```

Oder alle Seiten mit einem lokalen Server starten:

```bash
cd static-site
python -m http.server 8080
# → http://localhost:8080
```

---

## Bereiche (geplant)

| Bereich          | Technologie          | Status       |
|------------------|----------------------|--------------|
| Statische Site   | HTML/CSS             | Platzhalter  |
| React-Frontend   | React, TypeScript    | geplant      |
| API-Backend      | Python, FastAPI      | Platzhalter  |
| Worker           | Python               | Platzhalter  |
| Datenbank        | Postgres / Supabase  | geplant      |
| Hosting          | Cloudflare Pages     | geplant      |

---

## Dokumentation

- [`docs/architecture.md`](docs/architecture.md) – Zielarchitektur
- [`docs/product-principles.md`](docs/product-principles.md) – Produktprinzipien
- [`docs/safety-and-claims.md`](docs/safety-and-claims.md) – Erlaubte und nicht erlaubte Claims
- [`docs/roadmap.md`](docs/roadmap.md) – Phasenplan
- [`PROJECT_NOTES.md`](PROJECT_NOTES.md) – Architekturentscheidungen und offene Fragen

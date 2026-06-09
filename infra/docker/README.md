# Docker – Lokale Entwicklungsumgebung

## Services

| Service       | URL                        | Start               |
|---------------|----------------------------|---------------------|
| `api`         | http://localhost:8000      | immer               |
| `api` Docs    | http://localhost:8000/docs | immer               |
| `static-site` | http://localhost:8080      | immer               |
| `postgres`    | localhost:5432             | immer               |
| `worker`      | –                          | immer (Platzhalter) |
| `pgadmin`     | http://localhost:5050      | `--profile tools`   |

## Erster Start

```bash
# 1. Einmalig: Konfigurationsdateien anlegen
cp .env.docker.example .env.docker
cp infra/docker/pgadmin/pgpassfile.example infra/docker/pgadmin/pgpassfile

# 2. Standard (ohne pgAdmin)
docker compose up --build

# 3. Mit pgAdmin
docker compose --profile tools up --build

# 4. Im Hintergrund
docker compose --profile tools up -d --build
```

## pgAdmin

Login: `dev@echob.local` / `pgadmin` (aus `.env.docker`)

Der Server **„EchoB – Lokale Entwicklung"** ist bereits vorregistriert.
Durch die `pgpassfile` ist keine Passwort-Eingabe beim Öffnen nötig.

## Nützliche Commands

```bash
# Logs live verfolgen
docker compose logs -f api

# In den API-Container (bash)
docker compose exec api bash

# Postgres-Shell
docker compose exec postgres psql -U echob_dev -d echob

# Einzelnen Service neu starten
docker compose restart api

# Alles stoppen
docker compose down

# Alles stoppen + Datenbank-Volume löschen (sauberer Reset)
docker compose down -v

# Image neu bauen (nach Dependency-Änderungen in pyproject.toml)
docker compose build --no-cache api
```

## Hot-Reload

`services/api/app/` ist als Volume in den Container gemountet.
Jede Änderung am Python-Code ist sofort ohne Neustart aktiv.

## Ports

| Port | Service        |
|------|----------------|
| 8000 | API            |
| 8080 | Static Site    |
| 5050 | pgAdmin        |
| 5432 | Postgres       |

## Supabase vs. lokales Postgres

| Umgebung    | Datenbank                            |
|-------------|--------------------------------------|
| Lokal       | Postgres-Container (kein Internet)   |
| Staging     | Supabase (URL + Keys in `.env`)      |
| Production  | Supabase (URL + Keys in `.env`)      |

## Ordnerstruktur

```
infra/docker/
  nginx/
    static-site.conf      ← nginx-Konfiguration
  pgadmin/
    servers.json          ← vorregistrierter DB-Server
    pgpassfile            ← Auto-Login (in .gitignore, nicht ins Repo)
    pgpassfile.example    ← Vorlage
  postgres/
    init/                 ← SQL-Scripts für ersten Start (aktuell leer)
```

## Phase 4: Redis hinzufügen

```yaml
# In docker-compose.yml ergänzen:
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

```bash
# In .env.docker ergänzen:
REDIS_URL=redis://redis:6379
```

# EchoB – Production-Deployment (Hetzner)

Architektur: **Frontend** auf Cloudflare Pages · **API + Postgres** auf Hetzner (Docker Compose) · **Auth** Supabase · **Zahlungen** Stripe.

```
Browser ──> echo-b.de (Cloudflare Pages, statisch)
        ──> api.echo-b.de (Hetzner: Caddy → FastAPI → Postgres)
```

---

## 1. DNS (Cloudflare)

- **A-Record**: `api` → `<SERVER-IP>` — Proxy-Status **„DNS only"** (graue Wolke!),
  damit der API-Traffic nicht durch den Cloudflare-Proxy läuft und Caddy das
  TLS-Zertifikat ausstellen kann.

## 2. Server vorbereiten (einmalig)

```bash
ssh root@<SERVER-IP>

# Docker installieren – entfällt beim Hetzner "Docker CE"-App-Image
curl -fsSL https://get.docker.com | sh

# Repo klonen (privates Repo → GitHub Personal Access Token als Passwort)
git clone https://github.com/andiego55/echob.git /opt/echob
cd /opt/echob
```

## 3. Konfiguration

```bash
cp .env.production.example .env.docker
nano .env.docker            # ALLE Werte ausfüllen, siehe Kommentare in der Datei

# Secrets erzeugen:
openssl rand -hex 32        # → SECRET_KEY
openssl rand -base64 24     # → POSTGRES_PASSWORD (auch in DATABASE_URL eintragen!)
```

## 4. Starten

```bash
docker compose -f docker-compose.prod.yml up -d --build

# Prüfen:
docker compose -f docker-compose.prod.yml ps
curl https://api.echo-b.de/api/v1/health
# → {"status":"ok", ..., "environment":"production"}
```

Die Postgres-Init-Skripte (`infra/docker/postgres/init/*.sql`) laufen beim
ersten Start automatisch. Caddy holt das TLS-Zertifikat selbstständig
(DNS muss dafür bereits auf den Server zeigen).

## 5. Externe Dienste umstellen

| Dienst | Einstellung |
|---|---|
| **Cloudflare Pages** | Env-Var `VITE_API_URL=https://api.echo-b.de` setzen → Re-Deploy |
| **Supabase** | Auth → URL Configuration: Site URL `https://echo-b.de`, Redirect URLs ergänzen |
| **Stripe** | Webhook-Endpoint anlegen: `https://api.echo-b.de/api/v1/subscription/webhook` (Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`) → Signing Secret als `STRIPE_WEBHOOK_SECRET` in `.env.docker`, dann `docker compose -f docker-compose.prod.yml up -d api` |

## 6. Updates deployen

```bash
cd /opt/echob
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## 7. Betrieb

```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f api

# Manuelles DB-Backup (zusätzlich zu den Hetzner-Snapshots)
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U echob echob | gzip > /root/echob-$(date +%F).sql.gz

# Neue SQL-Migration einspielen (Beispiel)
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U echob -d echob < infra/docker/postgres/init/06_xyz.sql
```

**Sicherheits-Checkliste:**
- [x] Hetzner-Firewall: nur 22/80/443 offen (Postgres & API haben keine Host-Ports)
- [x] Hetzner-Backups aktiviert (täglich, automatisch)
- [x] `ENVIRONMENT=production` erzwingt SECRET_KEY & verbietet localhost-CORS
- [ ] Stripe auf Live-Keys umgestellt (`sk_live_…`)

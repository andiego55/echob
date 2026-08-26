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

`/opt/echob` **ist** eine Git-Auscheckung. Ein Update ist deshalb ein `git pull` plus ein
Neubau des `api`-Abbilds. Das Frontend deployt getrennt über Cloudflare beim Push auf `main`
und braucht hier gar nichts.

> **Die Reihenfolge ist nicht beliebig: erst Migration, dann Neubau.** Umgekehrt startet die
> neue API gegen ein altes Schema und fällt mit `UndefinedColumnError` um — schon passiert.

**Ohne neue Migration:**

```bash
cd /opt/echob && git pull && docker compose -f docker-compose.prod.yml up -d --build api && sleep 15 && curl -s -o /dev/null -w '%{http_code}\n' https://api.echo-b.de/api/v1/health
```

**Mit neuer Migration** — Dateiname ausschreiben, nie `NN_*.sql`; ein Glob spielt sonst
irgendwann versehentlich alle Skripte erneut ein:

```bash
cd /opt/echob && git pull && set -a && . ./.env.docker && set +a && docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" < infra/docker/postgres/init/94_couple_honest.sql && docker compose -f docker-compose.prod.yml up -d --build api && sleep 15 && curl -s -o /dev/null -w '%{http_code}\n' https://api.echo-b.de/api/v1/health
```

`ON_ERROR_STOP=1` sorgt dafür, dass die Kette abbricht, statt bei einem SQL-Fehler
weiterzulaufen und die API gegen ein halbes Schema zu starten. Erwartete Ausgabe am Ende:
`200`. Die Init-Skripte sind idempotent (`CREATE TABLE IF NOT EXISTS`), ein zweiter Lauf
schadet also nicht.

> **Warum hier nichts kopiert und nichts gesichert wird.** Früher stand an dieser Stelle ein
> `tar | ssh`-Transfer plus ein `cp -r … app.bak.$(date …)` „zur Sicherheit". Beides ist weg:
> Der Code liegt in Git, ein Backup davon auf demselben Server ist keins — und die Kopien
> wurden nie aufgeräumt. Sie sind der Grund, warum sich auf dem Prod-Host über zwanzig
> `app.bak.*`-Verzeichnisse angesammelt haben. Zurück geht es mit `git checkout <commit>`.

**Nach dem Deploy prüfen, ob ein neues Antwortfeld wirklich ankommt** — FastAPI streicht
lautlos alles, was nicht im `response_model` steht:

```bash
curl -s https://api.echo-b.de/openapi.json | grep -c "feldname"
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

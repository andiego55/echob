-- ── Org-Billing + Fall-Aktivierung (Vertrieb Phase 3) ────────────────────────
-- Stripe-Abo auf Org-Ebene + „aktivierter Fall" (Sitz). Die Profi-Werkzeuge sind
-- gegated: ein nicht-Demo-Fall muss aktiviert sein (activated_at) und das Org-Abo
-- aktiv. Der Beispielfall (is_demo) zählt nie und ist immer frei.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS). Manuell einspielen:
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/20_org_billing.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/20_org_billing.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Stripe-Abo je Organisation (plan existiert bereits: free/solo/praxis/institut) ─
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status    TEXT;   -- active/trialing/past_due/canceled/…
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_ends_at   TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_sub
    ON organizations (stripe_subscription_id);

-- ── Fall-Aktivierung (Sitz) ──────────────────────────────────────────────────
-- NULL = nicht aktiviert (Werkzeuge gesperrt, außer Demo). Demo zählt nie als Sitz.
ALTER TABLE case_shares ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

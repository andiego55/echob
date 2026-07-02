-- ── Kontakt-/Lead-Anfragen (Coaching-Erstgespräch, Demo, allgemein) ──────────
-- Niedrigschwelliges öffentliches Lead-Formular (kein Login). E-Mail ODER
-- Telefon genügt (App-seitig erzwungen; beide Spalten optional). Zusätzlich zur
-- Speicherung wird best-effort eine Benachrichtigung an kontakt@echo-b.de
-- verschickt (Resend, siehe notify_service).
--
-- Idempotent (CREATE TABLE IF NOT EXISTS). Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/29_contact_requests.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contact_requests (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    kind        TEXT        NOT NULL DEFAULT 'coaching'
                            CHECK (kind IN ('coaching', 'demo', 'general')),
    name        TEXT,
    email       TEXT,
    phone       TEXT,
    message     TEXT,
    source      TEXT,                       -- z. B. 'coaching_hero', 'einzeltermin'
    handled     BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created ON contact_requests (created_at DESC);

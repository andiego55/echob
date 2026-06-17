-- ── Einwilligungen (DSGVO Art. 7 Nachweispflicht) ───────────────────────────
-- Append-only-Protokoll erteilter Einwilligungen. Neueste Zeile je user_id = aktueller Stand.
-- Läuft beim ersten Start eines frischen Containers automatisch.
-- Bei bestehender DB einmalig einspielen:
--   docker compose exec -T postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/11_consents.sql
-- Prod (Hetzner): psql -U echob -d echob -f .../11_consents.sql

CREATE TABLE IF NOT EXISTS user_consents (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,                      -- Supabase auth.users.id
    version         TEXT        NOT NULL,                      -- Version des Einwilligungstexts
    privacy_policy  BOOLEAN     NOT NULL DEFAULT FALSE,        -- Datenschutzerklärung akzeptiert
    sensitive_ai    BOOLEAN     NOT NULL DEFAULT FALSE,        -- Art. 9 + KI/OpenAI (USA) ausdrücklich
    items           JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- Wortlaut/Details der Zustimmung
    accepted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id
    ON user_consents (user_id, accepted_at DESC);

COMMENT ON TABLE user_consents IS
    'Protokoll erteilter Einwilligungen (DSGVO Art. 7 Nachweispflicht). Append-only.';

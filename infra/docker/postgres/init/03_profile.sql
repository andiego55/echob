-- ── user_profiles: Beziehungsprofil / Selbstbeschreibung ─────────────────────
-- Läuft automatisch beim ersten Start eines frischen Containers.
-- Bei bestehender DB einmalig ausführen: docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/03_profile.sql

CREATE TABLE IF NOT EXISTS user_profiles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL UNIQUE,
    modules           JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary           JSONB NOT NULL DEFAULT '{}'::jsonb,
    safety_status     TEXT NOT NULL DEFAULT 'no_indication'
                      CHECK (safety_status IN (
                          'no_indication', 'unclear', 'heightened_attention', 'acute_concern'
                      )),
    completed_modules TEXT[] NOT NULL DEFAULT '{}',
    display_name      TEXT,
    plan              TEXT NOT NULL DEFAULT 'trial'
                      CHECK (plan IN ('trial', 'early_bird', 'regular', 'annual')),
    trial_started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subscription_ends_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);

-- echo_messages.case_id nullable machen (für Profil-Chats ohne Fall-Kontext)
-- Schlägt bei bereits geänderter Spalte fehl – das ist ok (idempotent ignorieren)
ALTER TABLE echo_messages ALTER COLUMN case_id DROP NOT NULL;

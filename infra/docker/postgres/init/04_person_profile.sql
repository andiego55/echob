-- 04_person_profile.sql
-- Personenprofil: Fremdeinschätzung der anderen Person in einem Fall
--
-- Manuell einspielen (falls Container bereits läuft):
--   docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/04_person_profile.sql

CREATE TABLE IF NOT EXISTS person_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    modules JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    completed_modules TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_person_profiles_case_id ON person_profiles (case_id);
CREATE INDEX IF NOT EXISTS idx_person_profiles_user_id ON person_profiles (user_id);

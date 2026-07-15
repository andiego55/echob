-- ── Ausbildungsbereich: Institut-Konten (eigene Domäne) ──────────────────────
-- Dritte Vertikale neben Nutzer und Fachpersonen: Ausbildungsinstitute + (später)
-- Student:innen. Streng getrennt (eigene Tabellen/Endpoints/Seiten), nutzt aber
-- die generischen Fall-/Echo-Primitive als gemeinsame Engine.
--
-- Rolle = Existenz eines training_institutes-Rows (wie professional_profiles).
-- Signup ist invite-gated: Registrierung nur mit gültigem institute_access_codes.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS). Manuell einspielen:
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/38_training_institutes.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/38_training_institutes.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Institut-Konto (der didaktische Leiter / Ausbilder als Account-Inhaber).
CREATE TABLE IF NOT EXISTS training_institutes (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL UNIQUE,            -- Supabase-Auth-User des Ausbilders
    name          TEXT        NOT NULL,                   -- Institutsname
    contact_name  TEXT,                                   -- didaktische Leitung (Ansprechperson)
    email         TEXT,
    student_quota INT         NOT NULL DEFAULT 0,         -- Kontingent Studierenden-Plätze (Phase 2)
    example_quota INT         NOT NULL DEFAULT 5,         -- max. anlegbare Beispielfälle (Kostenschutz)
    plan          TEXT        NOT NULL DEFAULT 'ausbildung',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ein generiertes Beispiel = 1 Fall (+ optional paar-gekoppelter Partnerfall).
-- Die Fälle selbst liegen in der generischen cases-Tabelle (gemeinsame Engine),
-- owner = user_id des Instituts; institute_examples ist die Ausbildungs-Hülle.
CREATE TABLE IF NOT EXISTS institute_examples (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id    UUID        NOT NULL REFERENCES training_institutes(id) ON DELETE CASCADE,
    title           TEXT        NOT NULL,
    description     TEXT,
    status          TEXT        NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'archived')),
    primary_case_id UUID        REFERENCES cases(id) ON DELETE SET NULL,   -- Fallperson
    partner_case_id UUID        REFERENCES cases(id) ON DELETE SET NULL,   -- optional Partnerperson
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_institute_examples_institute ON institute_examples (institute_id, status);

-- KI-Generierungs-Jobs: Rahmen-Eingaben + Status (Async/Audit/Kostennachvollzug).
CREATE TABLE IF NOT EXISTS case_generations (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID        NOT NULL REFERENCES training_institutes(id) ON DELETE CASCADE,
    example_id   UUID        REFERENCES institute_examples(id) ON DELETE SET NULL,
    input        JSONB       NOT NULL,                    -- Pseudonym, Belastung, Beziehung, Glossar, Szenenzahl, ...
    status       TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'running', 'done', 'failed')),
    error        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_generations_institute ON case_generations (institute_id, status);

-- Invite-gated Signup: nur mit gültigem Code wird ein Institut-Konto angelegt.
-- Codes werden manuell vergeben (nach Demo/Vertrag): setzen zugleich die Kontingente.
CREATE TABLE IF NOT EXISTS institute_access_codes (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code             TEXT        NOT NULL UNIQUE,
    note             TEXT,                                -- für welches Institut / Merker
    student_quota    INT         NOT NULL DEFAULT 0,      -- wird bei Einlösung aufs Institut übertragen
    example_quota    INT         NOT NULL DEFAULT 5,
    used_by_user_id  UUID,
    used_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at       TIMESTAMPTZ                          -- optional; NULL = unbegrenzt
);
CREATE INDEX IF NOT EXISTS idx_institute_access_codes_code ON institute_access_codes (code);

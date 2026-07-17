-- Migration 50: Lernmodule (Ausbildungsbereich).
--
-- Strukturierte Lerneinheiten: ein Modul bündelt geordnete Schritte (Lektionen;
-- später auch Fälle/Aufgaben) + didaktischen Leitfaden. Fundament für verkaufbare
-- Module (Fallbeispiel + Leitfaden + Raster). Eigene Domäne, rein additiv.
-- Idempotent.
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/50_learning_modules.sql

CREATE TABLE IF NOT EXISTS learning_modules (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id   UUID        NOT NULL REFERENCES training_institutes(id) ON DELETE CASCADE,
    title          TEXT        NOT NULL,
    description    TEXT,
    didactic_guide TEXT,                                     -- Dozentenleitfaden (nur Institut)
    status         TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    sellable       BOOLEAN     NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_learning_modules ON learning_modules (institute_id, created_at DESC);

CREATE TABLE IF NOT EXISTS learning_module_steps (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id  UUID        NOT NULL REFERENCES learning_modules(id) ON DELETE CASCADE,
    position   INT         NOT NULL DEFAULT 0,
    kind       TEXT        NOT NULL DEFAULT 'lesson',        -- lesson | case | assignment (später)
    title      TEXT        NOT NULL,
    content    TEXT,                                         -- Lektion: Markdown
    ref_id     UUID,                                         -- case→example, assignment→assignment (später)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_learning_module_steps ON learning_module_steps (module_id, position);

CREATE TABLE IF NOT EXISTS student_modules (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id       UUID        NOT NULL REFERENCES learning_modules(id) ON DELETE CASCADE,
    student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    completed_steps JSONB       NOT NULL DEFAULT '[]'::jsonb, -- [step_id]
    status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (module_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_student_modules ON student_modules (student_id, status);

-- Migration 47: Generisches Aufgaben-/Zuweisungsmodell (Ausbildungsbereich).
--
-- Das Rückgrat für „nicht nur Fälle": Aufgaben, Reflexionshilfen, Ressourcen (später
-- Dialoge/Quiz) werden vom Institut erstellt und an Studierende zugewiesen. Eigene
-- Domäne, rein additiv — berührt Nutzer/Fachperson nicht. Idempotent.
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/47_assignments.sql

CREATE TABLE IF NOT EXISTS institute_assignments (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID        NOT NULL REFERENCES training_institutes(id) ON DELETE CASCADE,
    kind         TEXT        NOT NULL,                       -- task | reflection | resource
    title        TEXT        NOT NULL,
    instructions TEXT,
    payload      JSONB       NOT NULL DEFAULT '{}'::jsonb,   -- z.B. resource: {link}
    rubric_id    UUID,                                       -- optionaler Soft-Ref auf institute_rubrics
    status       TEXT        NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_institute_assignments ON institute_assignments (institute_id, created_at DESC);

CREATE TABLE IF NOT EXISTS student_assignments (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID        NOT NULL REFERENCES institute_assignments(id) ON DELETE CASCADE,
    student_id    UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status        TEXT        NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'submitted', 'reviewed')),
    response      JSONB,                                     -- {text}
    feedback      TEXT,
    scores        JSONB,                                     -- optionale Raster-Punkte (P-B2), self-contained
    total_points  NUMERIC,
    due_at        TIMESTAMPTZ,
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at  TIMESTAMPTZ,
    reviewed_at   TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assignment_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_student_assignments_student     ON student_assignments (student_id, status);
CREATE INDEX IF NOT EXISTS idx_student_assignments_assignment  ON student_assignments (assignment_id);

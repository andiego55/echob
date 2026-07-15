-- ── Ausbildungsbereich: Studierenden-Notizen je Fall-Arbeitskopie ─────────────
-- Ein Notiz-Datensatz je (Student, geklonter Fall), strukturiert wie die
-- Fachpersonen-Notizen. Klartext (fiktive Übungsfälle).
--
-- Idempotent (CREATE TABLE IF NOT EXISTS). Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/40_student_notes.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_notes (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id           UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    case_id              UUID        NOT NULL,       -- der geklonte Fall
    first_impressions    TEXT,
    key_scenes           TEXT,
    open_questions       TEXT,
    conversation_prompts TEXT,
    next_steps           TEXT,
    free_text            TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, case_id)
);
CREATE INDEX IF NOT EXISTS idx_student_notes_student ON student_notes (student_id);

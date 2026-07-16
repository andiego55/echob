-- Migration 44: Studierenden-Sitzungsnotizen (titelbare Notizen aus Vorlagen).
--
-- Ergänzt den stehenden Fallüberblick (student_notes) um einen Sitzungsverlauf:
-- mehrere datierte, betitelte Notizen mit Abschnitten (content.sections), analog
-- zu den Fachpersonen-Sitzungsnotizen. Klartext (fiktive Übungsfälle).
-- Idempotent.
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/44_student_session_notes.sql

CREATE TABLE IF NOT EXISTS student_session_notes (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    case_id      UUID        NOT NULL,                       -- der geklonte Fall
    session_date DATE,
    title        TEXT,
    content      JSONB       NOT NULL DEFAULT '{"sections": []}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_session_notes
    ON student_session_notes (student_id, case_id, session_date DESC, created_at DESC);

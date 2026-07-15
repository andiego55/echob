-- ── Ausbildung: Einreichungen Student → Ausbildungsinstitut ───────────────────
-- Die/der Studierende reicht die Fallarbeit (Hypothesen + Notizen + Berichte als
-- Snapshot) beim Institut ein; der Ausbilder sieht sie in einer Inbox und gibt
-- Rückmeldung. Der Snapshot (payload) ist Klartext: es ist die Analyse eines
-- fiktiven Übungsfalls, keine echten Personendaten (konsistent zur Domäne).
--
-- Idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/41_student_submissions.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_submissions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institute_id UUID        NOT NULL REFERENCES training_institutes(id) ON DELETE CASCADE,
    copy_id      UUID        NOT NULL REFERENCES student_case_copies(id) ON DELETE CASCADE,
    title        TEXT,                                    -- Fall-Titel zum Zeitpunkt
    message      TEXT,                                    -- Begleitnachricht der/des Studierenden
    payload      JSONB       NOT NULL DEFAULT '{}'::jsonb,-- Snapshot: hypotheses, notes, reports
    status       TEXT        NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed')),
    feedback     TEXT,                                    -- Rückmeldung des Ausbilders
    reviewed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_submissions_institute ON student_submissions (institute_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_submissions_student   ON student_submissions (student_id, created_at DESC);

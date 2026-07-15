-- ── Ausbildungsbereich: Student:innen + Einladungen + Fall-Kopien ─────────────
-- Zweite Rolle der Ausbildungs-Domäne. Ein:e Student:in gehört zu genau 1 Institut.
-- Rolle = Existenz einer students-Zeile (analog training_institutes/professional_profiles).
-- Einladung: Institut erzeugt student_invites (Token+Code); Student nimmt an → students-Zeile.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS). Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/39_students.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS students (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL UNIQUE,            -- Supabase-Auth-User der/des Studierenden
    institute_id UUID        NOT NULL REFERENCES training_institutes(id) ON DELETE CASCADE,
    display_name TEXT,                                   -- Pseudonym/Anzeigename
    status       TEXT        NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'removed')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_students_institute ON students (institute_id, status);

CREATE TABLE IF NOT EXISTS student_invites (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    token            TEXT        NOT NULL UNIQUE,        -- langer Zufallswert für den Link
    code             TEXT        NOT NULL UNIQUE,        -- kurzer Code für manuelle Eingabe (XXXX-XXXX)
    institute_id     UUID        NOT NULL REFERENCES training_institutes(id) ON DELETE CASCADE,
    label            TEXT,                               -- interner Merker (z. B. „Kohorte 2026 / M.")
    status           TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'accepted', 'revoked')),
    accepted_user_id UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at      TIMESTAMPTZ,
    expires_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_student_invites_institute ON student_invites (institute_id, status);
CREATE INDEX IF NOT EXISTS idx_student_invites_code      ON student_invites (code);

-- P2b: geklonte Fall-Arbeitskopien je Student (Freigabe eines Beispiels = Klon).
CREATE TABLE IF NOT EXISTS student_case_copies (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    example_id      UUID        REFERENCES institute_examples(id) ON DELETE SET NULL,
    case_id         UUID        NOT NULL REFERENCES cases(id) ON DELETE CASCADE,   -- primärer Klon
    partner_case_id UUID        REFERENCES cases(id) ON DELETE SET NULL,           -- optional Partner-Klon
    title           TEXT,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_case_copies_student ON student_case_copies (student_id);
-- Ein Beispiel pro Student nur einmal zuweisen:
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_example ON student_case_copies (student_id, example_id);

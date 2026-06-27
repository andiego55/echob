-- 26_couples.sql — Paar-Analyse im Fachpersonenbereich: zwei freigegebene Fälle koppeln.
--
-- SICHERHEIT: Eine Kopplung gewährt KEINEN neuen Datenzugriff. Koppeln und Paar-Echo gehen
-- für JEDEN der beiden Fälle weiter durch require_active_share / load_shared_bundle — es wird
-- nur zusammengeführt, was beide Partner ohnehin an DIESELBE Fachperson freigegeben haben.
-- Widerruf einer Freigabe entzieht den Zugriff sofort (404), auch im Paar-Echo.

-- ── Kopplung zweier Fälle (pro Fachperson) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS case_couples (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id UUID NOT NULL,
    case_id_a            UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    case_id_b            UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    is_demo              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Kanonische Reihenfolge (a < b) erzwingen → ungeordnetes Paar eindeutig, keine Selbst-Kopplung
    CONSTRAINT case_couples_distinct  CHECK (case_id_a <> case_id_b),
    CONSTRAINT case_couples_canonical CHECK (case_id_a < case_id_b)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_case_couples_pair
    ON case_couples (professional_user_id, case_id_a, case_id_b);
-- „Ist Fall X gekoppelt?" schnell über beide Spalten
CREATE INDEX IF NOT EXISTS idx_case_couples_a ON case_couples (professional_user_id, case_id_a);
CREATE INDEX IF NOT EXISTS idx_case_couples_b ON case_couples (professional_user_id, case_id_b);

-- ── Paar-Echo-Sitzungen (gespiegelt vom Profi-Echo, aber an die Kopplung gebunden) ──
CREATE TABLE IF NOT EXISTS professional_couple_echo_sessions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id            UUID NOT NULL REFERENCES case_couples (id) ON DELETE CASCADE,
    professional_user_id UUID NOT NULL,
    title                TEXT,                          -- NULL = "Neuer Chat"
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_couple_echo_sessions_couple
    ON professional_couple_echo_sessions (couple_id, updated_at DESC);

-- ── Paar-Echo-Nachrichten (Inhalt verschlüsselt, enc:v1:) ────────────────────
CREATE TABLE IF NOT EXISTS professional_couple_echo_messages (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id           UUID NOT NULL REFERENCES professional_couple_echo_sessions (id) ON DELETE CASCADE,
    couple_id            UUID NOT NULL REFERENCES case_couples (id) ON DELETE CASCADE,
    professional_user_id UUID NOT NULL,
    role                 TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content              TEXT NOT NULL,                 -- verschlüsselt
    thread_type          TEXT NOT NULL DEFAULT 'couple',
    glossary_slug        TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_couple_echo_messages_session
    ON professional_couple_echo_messages (session_id, created_at);

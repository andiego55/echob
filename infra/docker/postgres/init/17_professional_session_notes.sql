-- ── Fachpersonen-Sitzungsnotizen ─────────────────────────────────────────────
-- Strukturierte, datierte Sitzungsnotizen (Verlauf) je Fall sowie eigene
-- Notiz-Vorlagen der Fachperson. Eine Notiz ist — wie ein Bericht — eine Liste
-- von Abschnitten (sections), verschlüsselt als JSONB gespeichert.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS). Manuell einspielen:
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/17_professional_session_notes.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/17_professional_session_notes.sql
--
-- Der bestehende „Fallüberblick" (professional_notes, 6 Felder) bleibt unverändert.
-- Zugriff auf Sitzungsnotizen läuft serverseitig über case_shares (require_active_share).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) Eigene Notiz-Vorlagen (fall-unabhängig, je Fachperson) ─────────────────
-- fields = Liste von Abschnitts-Überschriften (Klartext; generische Struktur-Labels).
CREATE TABLE IF NOT EXISTS professional_note_templates (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id UUID NOT NULL,
    name                 TEXT NOT NULL,
    fields               JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prof_note_templates_prof
    ON professional_note_templates (professional_user_id, updated_at DESC);

-- ── 2) Sitzungsnotizen (fall-gebunden, je Fachperson) ─────────────────────────
-- content = {sections:[{heading,text}]}, auf App-Ebene verschlüsselt (encrypt_json_strings).
CREATE TABLE IF NOT EXISTS professional_session_notes (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id UUID NOT NULL,
    case_id              UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    session_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    title                TEXT,
    content              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prof_session_notes_prof_case
    ON professional_session_notes (professional_user_id, case_id, session_date DESC);

-- ── Fachpersonen-Fallberichte ────────────────────────────────────────────────
-- Eigene Berichtsvorlagen (per Anweisung/Echo-Assist) und generierte Fallberichte
-- der Fachperson. Berichte sind strukturierte Abschnitte (sections), verschlüsselt
-- als JSONB gespeichert — analog zur reports-Tabelle der Nutzer:innen.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS). Manuell einspielen:
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/16_professional_reports.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/16_professional_reports.sql
--
-- Sicherheitsmodell: Vorlagen gehören der Fachperson (professional_user_id).
-- Berichte sind fall-gebunden; der Zugriff läuft serverseitig über case_shares
-- (require_active_share). Inhalte (instruction, content) werden auf App-Ebene
-- verschlüsselt (crypto.encrypt / encrypt_json_strings).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) Eigene Berichtsvorlagen (fall-unabhängig, je Fachperson) ───────────────
CREATE TABLE IF NOT EXISTS professional_report_templates (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id UUID NOT NULL,
    name                 TEXT NOT NULL,
    instruction          TEXT NOT NULL,                 -- verschlüsselt (App-Ebene)
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prof_report_templates_prof
    ON professional_report_templates (professional_user_id, updated_at DESC);

-- ── 2) Generierte Fallberichte (fall-gebunden, je Fachperson) ─────────────────
-- source: 'standard:verlauf' | 'standard:uebergabe' | 'standard:standort' | 'template'
CREATE TABLE IF NOT EXISTS professional_reports (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id UUID NOT NULL,
    case_id              UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    source               TEXT NOT NULL,
    template_id          UUID REFERENCES professional_report_templates (id) ON DELETE SET NULL,
    title                TEXT,
    content              JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {sections:[{heading,text}]}, verschlüsselt
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prof_reports_prof_case
    ON professional_reports (professional_user_id, case_id, created_at DESC);

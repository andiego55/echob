-- ── Fachpersonen-Kollaboration: Zuweisungen, Vorlagen, Termine ────────────────
-- Wirkrichtung Fachperson → Nutzer:in: zugewiesene Dialoge, Fragebögen,
-- Nachrichten, Ressourcen (generisch: Typ-Diskriminator + JSONB-Payload, damit
-- neue Feature-Typen OHNE Schema-Umbau dazukommen) + Termine (eigene Schicht mit
-- echten Zeitspalten).
--
-- Idempotent. Manuell einspielen:
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/09_professional_collab.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/09_professional_collab.sql
--
-- Sicherheit: Erstellen ist server-seitig an eine AKTIVE Freigabe (case_shares)
-- gebunden (sharing_service.require_active_share). Freitexte in payload/response
-- werden app-seitig feldverschlüsselt (core/crypto). `type` bewusst OHNE CHECK
-- (app-seitige Registry) — neuer Typ = reiner App-Code, keine Migration.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Wiederverwendbare Vorlagen (Dialog-Vorlagen, Fragebogen-Defs, Quick-Replies …)
CREATE TABLE IF NOT EXISTS professional_templates (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id UUID NOT NULL,
    type                 TEXT NOT NULL,                       -- app-validiert (kein CHECK)
    title                TEXT,
    payload              JSONB NOT NULL DEFAULT '{}'::jsonb,  -- feldverschlüsselt
    archived_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prof_templates_pro ON professional_templates (professional_user_id, type);

-- 2) Termine (eigene Schicht: echte Zeitspalten, indexierbar; NICHT im JSONB)
CREATE TABLE IF NOT EXISTS professional_appointments (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id              UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    professional_user_id UUID NOT NULL,
    user_id              UUID NOT NULL,                       -- Klient:in (Empfänger), für Inbox
    title                TEXT,
    payload              JSONB NOT NULL DEFAULT '{}'::jsonb,  -- feldverschlüsselt (Agenda/Ort/Link/Notiz)
    start_at             TIMESTAMPTZ NOT NULL,
    end_at               TIMESTAMPTZ,
    status               TEXT NOT NULL DEFAULT 'proposed'
                         CHECK (status IN ('proposed','confirmed','cancelled','completed')),
    proposed_by          TEXT NOT NULL DEFAULT 'professional'
                         CHECK (proposed_by IN ('professional','user')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prof_appt_user ON professional_appointments (user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_prof_appt_case ON professional_appointments (case_id);
CREATE INDEX IF NOT EXISTS idx_prof_appt_pro  ON professional_appointments (professional_user_id, start_at);

-- 3) Zuweisungen (generisch: dialog | questionnaire | message | resource | …)
CREATE TABLE IF NOT EXISTS professional_assignments (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id              UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    professional_user_id UUID NOT NULL,
    user_id              UUID NOT NULL,                       -- Empfänger:in (Klient:in)
    type                 TEXT NOT NULL,                       -- app-validiert (kein CHECK)
    template_id          UUID REFERENCES professional_templates (id) ON DELETE SET NULL,
    appointment_id       UUID REFERENCES professional_appointments (id) ON DELETE SET NULL,
    title                TEXT,
    payload              JSONB NOT NULL DEFAULT '{}'::jsonb,  -- feldverschlüsselt; Dialog: topic/intention/guardrails/hypothesis_for_echo
    status               TEXT NOT NULL DEFAULT 'sent'
                         CHECK (status IN ('draft','sent','seen','in_progress','completed','dismissed','revoked')),
    response             JSONB,                               -- feldverschlüsselt (z. B. Fragebogen-Antworten)
    responded_at         TIMESTAMPTZ,
    consent_ref          UUID,                                -- spätere „Einwilligung pro Aktion"
    due_at               TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    seen_at              TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prof_assign_user ON professional_assignments (user_id, status);
CREATE INDEX IF NOT EXISTS idx_prof_assign_case ON professional_assignments (case_id);
CREATE INDEX IF NOT EXISTS idx_prof_assign_pro  ON professional_assignments (professional_user_id);
CREATE INDEX IF NOT EXISTS idx_prof_assign_tmpl ON professional_assignments (template_id);

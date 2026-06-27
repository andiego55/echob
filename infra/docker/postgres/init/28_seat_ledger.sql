-- 28_seat_ledger.sql — Verbrauchsbasierte Abrechnung (Sitze).
--
-- Werteinheit = ein im laufenden Abrechnungszeitraum der Org (organizations.current_period_start)
-- AKTIVIERTER, distinkter Fall. Re-Aktivierung im selben Zeitraum zählt nicht doppelt; Abschließen/
-- Archivieren gibt die Einheit im laufenden Zeitraum NICHT zurück; laufende Fälle re-konsumieren je
-- Zeitraum. Demo (case_shares.is_demo) zählt nie. Das Ledger ist die nachvollziehbare Quelle der
-- Wahrheit (Audit + Abrechnung); case_shares.activated_at bleibt als Anzeige-Denormalisierung.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;

-- Jede Aktivierung/Freigabe eines Falls als nachvollziehbarer Eintrag.
CREATE TABLE IF NOT EXISTS case_activations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id               UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    case_id              UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    professional_user_id UUID NOT NULL,
    billing_period_start TIMESTAMPTZ NOT NULL,       -- Zeitraum, in dem diese Aktivierung als Verbrauch zählt
    activated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at          TIMESTAMPTZ,                 -- NULL = aktuell offen (Werkzeuge nutzbar)
    release_reason       TEXT,                        -- 'manual' | 'archived' | 'revoked' | 'period_end'
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Verbrauchszählung: distinkte Fälle je Org + Zeitraum
CREATE INDEX IF NOT EXISTS idx_case_activations_period
    ON case_activations (org_id, billing_period_start, case_id);
-- Schnelles Finden der aktuell offenen Belegung je Fall
CREATE INDEX IF NOT EXISTS idx_case_activations_open
    ON case_activations (org_id, case_id, billing_period_start) WHERE released_at IS NULL;

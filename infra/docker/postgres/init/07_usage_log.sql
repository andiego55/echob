-- ── KI-Nutzungs-Log ──────────────────────────────────────────────────────────
-- Löschfester Zähler für kostenintensive KI-Aktionen (Kostenschutz
-- Entwicklungsphase). Anders als COUNT auf reports/scale_scores kann das
-- Kontingent nicht durch Löschen zurückgesetzt werden.
-- Bei bestehender DB einmalig einspielen.

CREATE TABLE IF NOT EXISTS ai_usage_log (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    kind       TEXT NOT NULL CHECK (kind IN ('report', 'scale_calc')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_kind ON ai_usage_log (user_id, kind);

-- ── Rückblicke (Verlauf / Muster über Zeit) ──────────────────────────────────
-- Gespeicherte, datierte Rückblicke je Fall: ein LLM-Narrativ plus ein Snapshot
-- der quantitativen Trends zum Erzeugungszeitpunkt. Die Live-Trends (Diagramme)
-- werden bei jedem Aufruf frisch aus scenes/scale_scores berechnet — kein Cache.
-- Idempotent (CREATE TABLE IF NOT EXISTS), wie alle Init-Skripte.

CREATE TABLE IF NOT EXISTS case_reviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id      UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id      UUID NOT NULL,
    period_start DATE,
    period_end   DATE,
    narrative    TEXT NOT NULL,
    stats        JSONB NOT NULL DEFAULT '{}',
    scene_count  INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_reviews_case ON case_reviews (case_id, created_at DESC);

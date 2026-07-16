-- Migration 45: Bewertungsraster (Rubrics) des Ausbildungsinstituts.
--
-- Wiederverwendbare Raster (Kriterien × Punkte) für die Auswertung von
-- Einreichungen; Grundlage der KI-gestützten Bewertung (P-A). Rein additiv,
-- eigene Domäne — berührt Nutzer/Fachperson nicht. Idempotent.
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/45_institute_rubrics.sql

CREATE TABLE IF NOT EXISTS institute_rubrics (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID        NOT NULL REFERENCES training_institutes(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,
    description  TEXT,
    criteria     JSONB       NOT NULL DEFAULT '[]'::jsonb,  -- [{key, name, description, max_points}]
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_institute_rubrics ON institute_rubrics (institute_id, created_at DESC);

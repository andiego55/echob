-- Migration 51: payload an Lernmodul-Schritten (für Wissenschecks/Quiz u. a.).
--
-- Schritt-spezifische Konfiguration als JSONB. Für kind='quiz':
--   {"questions":[{"q":"…","options":["…"],"correct":0,"explanation":"…"}]}
-- Rein additiv, Default '{}'. Idempotent.
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/51_module_step_payload.sql

ALTER TABLE learning_module_steps ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

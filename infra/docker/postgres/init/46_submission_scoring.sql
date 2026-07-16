-- Migration 46: Bewertung von Einreichungen (Raster-Punkte an student_submissions).
--
-- Rein additive Spalten (alle nullable) — Bestandseinreichungen bleiben gültig,
-- keine Auswirkung auf bestehende Features. scores = self-contained Snapshot
-- [{key, name, max_points, points, note}], damit Student und Institut ohne das
-- Raster rendern können. Idempotent.
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/46_submission_scoring.sql

ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS rubric_id    UUID;
ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS scores       JSONB;
ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS total_points NUMERIC;

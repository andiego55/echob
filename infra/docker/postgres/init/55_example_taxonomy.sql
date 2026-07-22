-- Migration 55: Fallbibliothek-Ausbau (P-E) — Schwierigkeitsgrad + Themen-Tags an
-- institute_examples, damit Ausbilder:innen ihre Fälle einordnen, filtern und suchen können.
-- Rein additiv, Default-Werte, keine Auswirkung auf Nutzer/Fachpersonen.
--
-- difficulty: 0 = unbestimmt, 1 = leicht, 2 = mittel, 3 = schwer.
--
-- Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/55_example_taxonomy.sql

ALTER TABLE institute_examples
    ADD COLUMN IF NOT EXISTS difficulty SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE institute_examples DROP CONSTRAINT IF EXISTS institute_examples_difficulty_check;
ALTER TABLE institute_examples ADD CONSTRAINT institute_examples_difficulty_check
    CHECK (difficulty BETWEEN 0 AND 3);

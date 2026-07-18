-- Migration 53: Musterlösung / Experten-Blick je Beispiel-Fall.
--
-- Referenzeinschätzung (nur Dozent:in sichtbar), die zugleich der KI-Auswertung
-- als Vergleichsmaßstab dient. Rein additiv. Idempotent.
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/53_master_solution.sql

ALTER TABLE institute_examples ADD COLUMN IF NOT EXISTS master_solution TEXT;

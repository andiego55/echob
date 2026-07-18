-- Migration 52: Fristen an Aufgaben.
--
-- Ein optionales Fälligkeitsdatum je Aufgabe (gilt für alle Zugewiesenen).
-- Rein additiv. Idempotent.
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/52_assignment_due.sql

ALTER TABLE institute_assignments ADD COLUMN IF NOT EXISTS due_on DATE;

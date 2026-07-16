-- Migration 43: echo_chat_sessions.kind — trennt freie Echo-Sessions von Paar-Sessions.
--
-- Der Studierenden-Bereich nutzt echo_chat_sessions sowohl für das freie Echo
-- (kind='echo') als auch für die Paar-Analyse (kind='couple') auf demselben Fall.
-- Ohne die Spalte würden beide Session-Listen vermischen. Default 'echo' hält
-- Bestandsdaten (Nutzer-/Studierenden-Echo) unverändert korrekt.
-- Idempotent (ADD COLUMN IF NOT EXISTS).
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/43_echo_session_kind.sql

ALTER TABLE echo_chat_sessions ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'echo';

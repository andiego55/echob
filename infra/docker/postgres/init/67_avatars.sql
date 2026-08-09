-- Migration 67: Avatare für Nutzer:in und Fall (niedliche Tier-Palette).
--
-- Nicht sensibel (nur ein Emoji/Slug) → KEINE Feldverschlüsselung. Der Fall-Avatar
-- liegt bei den Onboarding-Antworten (neben dem Pseudonym der Fallperson), der
-- Nutzer-Avatar am Profil.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/67_avatars.sql

ALTER TABLE user_profiles      ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE onboarding_answers ADD COLUMN IF NOT EXISTS avatar TEXT;

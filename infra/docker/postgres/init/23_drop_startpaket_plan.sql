-- ── Startpaket vollständig stilllegen ────────────────────────────────────────
-- Das Startpaket wird nicht mehr angeboten und hat keine Abonnent:innen. Diese
-- Migration entfernt 'startpaket' aus dem Plan-Constraint von user_profiles.
-- Defensiv: etwaige (nicht erwartete) Startpaket-Zeilen werden vorher auf 'trial'
-- gesetzt, damit das strengere Constraint nicht an Altbeständen scheitert.
--
-- Idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/23_drop_startpaket_plan.sql
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE user_profiles SET plan = 'trial' WHERE plan = 'startpaket';

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_plan_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_plan_check
    CHECK (plan IN ('trial', 'early_bird', 'regular', 'annual'));

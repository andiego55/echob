-- Migration 49: KI-Aussteuerung des Ausbildungsinstituts.
--
-- Das Institut legt einen „Haus-Stil" fest (Ansatz/Ton/Tiefe/Freitext), der als
-- nachrangiger Steuerblock in das freie Echo-Gespräch der Studierenden fließt —
-- analog zur Fachpersonen-Aussteuerung (echo_modes.build_pro_steering). Rein
-- additive Spalten, klartext (Konfiguration, keine Personendaten). Idempotent.
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/49_institute_echo_settings.sql

ALTER TABLE training_institutes ADD COLUMN IF NOT EXISTS echo_approach        TEXT;
ALTER TABLE training_institutes ADD COLUMN IF NOT EXISTS echo_tone            INT;
ALTER TABLE training_institutes ADD COLUMN IF NOT EXISTS echo_depth           INT;
ALTER TABLE training_institutes ADD COLUMN IF NOT EXISTS echo_custom_steering TEXT;

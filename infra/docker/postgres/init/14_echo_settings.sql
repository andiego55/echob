-- 14_echo_settings.sql
-- Echo-Aussteuerung als Nutzer-/Fachpersonen-Einstellung.
-- Modus/Ansatz (Preset) + Regler (Ton/Tiefe 1..5) + optionales Freitextfeld.
-- echo_custom_steering wird feldverschlüsselt gespeichert (enc:v1:…), da der
-- Nutzer dort sensibles formulieren kann.

-- Nutzer:innen
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS echo_mode TEXT NOT NULL DEFAULT 'base';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS echo_tone SMALLINT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS echo_depth SMALLINT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS echo_custom_steering TEXT;

-- Fachpersonen
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS echo_approach TEXT NOT NULL DEFAULT 'balanced';
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS echo_tone SMALLINT;
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS echo_depth SMALLINT;
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS echo_custom_steering TEXT;

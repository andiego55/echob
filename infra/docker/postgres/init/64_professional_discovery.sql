-- Migration 64: Fachpersonen-Auffindbarkeit + Verbindungsanfragen (Opt-in).
--
-- Bisher konnten sich Nutzer:innen mit einer Fachperson nur ueber einen Einladungscode
-- verbinden. Neu: eine Fachperson kann sich freiwillig auffindbar machen (Opt-in), Nutzer:innen
-- koennen sie suchen und eine Verbindungsanfrage senden, die die Fachperson bestaetigen muss.
--
-- (1) discoverable-Flag auf professional_profiles (Default false = nicht gelistet).
-- (2) neuer Status 'requested' fuer professional_invites: nutzer-initiierte Anfrage, die auf die
--     Zustimmung der Fachperson wartet (im Gegensatz zu 'pending' = per E-Mail eingeladen, wartet
--     auf Registrierung; und 'accepted' = verbunden). Der Freigabe-/Registrierungs-Code bleibt
--     unveraendert; Sharing prueft weiterhin nur 'accepted'.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/64_professional_discovery.sql

ALTER TABLE professional_profiles
    ADD COLUMN IF NOT EXISTS discoverable BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_professional_profiles_discoverable
    ON professional_profiles (discoverable) WHERE discoverable = true;

-- Status 'requested' zulassen (Anfrage wartet auf Zustimmung der Fachperson).
ALTER TABLE professional_invites DROP CONSTRAINT IF EXISTS professional_invites_status_check;
ALTER TABLE professional_invites
    ADD CONSTRAINT professional_invites_status_check
    CHECK (status IN ('pending', 'accepted', 'requested'));

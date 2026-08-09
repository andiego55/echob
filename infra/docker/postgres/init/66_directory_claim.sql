-- Migration 66: Onboarding-Tracking fürs Fachpersonen-Verzeichnis.
--
-- claim_sent_at = wann die Einladung (Probeaccount-Link) verschickt wurde.
-- Der eigentliche Besitz läuft weiter über claimed_by_user_id (Migration 65):
-- beim Einladen wird das recherchierte Listing an die neue Nutzer-ID gebunden,
-- sodass es der Fachperson nach dem Login vorbefüllt im Editor erscheint.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/66_directory_claim.sql

ALTER TABLE directory_listings
    ADD COLUMN IF NOT EXISTS claim_sent_at TIMESTAMPTZ;

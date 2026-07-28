-- Migration 61: Einwilligungs-Nachweis an der Fall-Freigabe (DSGVO Art. 7 + Art. 9).
-- Jede Freigabe an eine Fachperson erfordert kuenftig eine ausdrueckliche Einwilligung;
-- hier wird festgehalten, welche Version des Einwilligungstexts wann akzeptiert wurde.
-- Der Wortlaut/Kontext wird zusaetzlich append-only in user_consents protokolliert.
-- Additiv, nullable (Bestandsfreigaben bleiben gueltig). Idempotent.
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/61_share_consent.sql

ALTER TABLE case_shares
    ADD COLUMN IF NOT EXISTS consent_version TEXT,
    ADD COLUMN IF NOT EXISTS consented_at    TIMESTAMPTZ;

-- Migration 68: Mehrere Fachrichtungen je Eintrag + Kassenzulassung.
--
-- professions[] ersetzt fachlich das bisherige einzelne profession-Feld; profession
-- bleibt als PRIMÄR-Kategorie erhalten (= professions[0], für Regionalseiten-Kanonik
-- und Rückwärtskompatibilität). bills_insurance = kann mit gesetzlicher KK abrechnen.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/68_directory_professions.sql

ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS professions     TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS bills_insurance BOOLEAN NOT NULL DEFAULT false;

-- Backfill: bestehende Einzel-Fachrichtung in das Array übernehmen.
UPDATE directory_listings
   SET professions = ARRAY[profession]
 WHERE professions = '{}' AND COALESCE(profession, '') <> '';

-- Suche über professions (Mehrfachnennung): GIN-Index.
CREATE INDEX IF NOT EXISTS idx_directory_professions ON directory_listings USING GIN (professions);

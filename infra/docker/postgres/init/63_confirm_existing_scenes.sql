-- Migration 63: Bestehende Szenen als bestaetigt markieren.
--
-- Der separate "Szene bestaetigen"-Schritt entfaellt: nutzerseitig angelegte Szenen
-- gelten mit dem Speichern als bestaetigt (siehe scenes-Router). Frueher angelegte,
-- nie bestaetigte Szenen waeren sonst dauerhaft unsichtbar fuer Echo/Berichte/Skalen
-- (die auf confirmed_by_user = true filtern). Diese Backfill-Migration schaltet sie frei;
-- ihr urspruenglich gespeicherter distress_score/Belastung bleibt dabei erhalten.
--
-- Idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/63_confirm_existing_scenes.sql

UPDATE scenes SET confirmed_by_user = true, updated_at = NOW()
WHERE confirmed_by_user = false;

-- Migration 56: Modul-Marktplatz (P-F, Storefront) — Preis + Kurzbeschreibung an
-- learning_modules. Das bestehende `sellable`-Flag steuert die Marktplatz-Listung
-- (sellable + status='published' => im Katalog sichtbar). Additiv, Defaults.
--
-- price_cents: Preis in Cent (0 = kostenlos). teaser: Kurzbeschreibung fürs Angebot.
--
-- Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/56_module_marketplace.sql

ALTER TABLE learning_modules
    ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS teaser TEXT;

ALTER TABLE learning_modules DROP CONSTRAINT IF EXISTS learning_modules_price_check;
ALTER TABLE learning_modules ADD CONSTRAINT learning_modules_price_check
    CHECK (price_cents >= 0);

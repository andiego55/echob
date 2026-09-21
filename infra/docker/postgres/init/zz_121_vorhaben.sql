-- zz_121_vorhaben.sql
-- Die dritte Grundform bekommt ihre zweite Art: das Vorhaben mit Schritten.
--
-- WARUM KEINE NEUE TABELLE
-- selbst_vorhaben gibt es seit zz_117, bisher mit genau einer Art ('krisenplan'). Der
-- Bauplan sagt: kein WERKZEUG bekommt eine eigene Tabelle, nur eine GRUNDFORM. Ein Ziel
-- mit Schritten ist dieselbe Grundform wie ein Krisenplan - etwas, das sich jemand
-- vornimmt. Es bekommt deshalb eine Art und keine Tabelle, und seine Schritte stehen im
-- JSONB: {warum, schritte: [{id, text, erledigt_at}], rhythmus_tage, rueckschau_am}.
--
-- WARUM DER STAND EINE SPALTE IST UND NICHT IM JSONB STEHT
-- Nach dem Stand wird GEFILTERT - die Uebersicht zeigt laufende, das Archiv den Rest,
-- und Echo liest spaeter nur die offenen. Was gefiltert wird, gehoert in eine Spalte mit
-- Bedingung; im JSONB waere es ein Wert, den niemand einschraenkt und jeder anders
-- schreibt.
--
-- 'ruht' und nicht 'aufgegeben': Ein Vorhaben, das gerade nicht dran ist, ist kein
-- Scheitern. Wer sein eigenes Wort dafuer liest, macht es beim naechsten Mal nicht mehr.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_121_vorhaben.sql

-- ── 1) Die zweite Art ───────────────────────────────────────────────────────
ALTER TABLE selbst_vorhaben DROP CONSTRAINT IF EXISTS selbst_vorhaben_art_check;
ALTER TABLE selbst_vorhaben ADD CONSTRAINT selbst_vorhaben_art_check
    CHECK (art IN ('krisenplan', 'ziel'));

-- ── 2) Der Stand ────────────────────────────────────────────────────────────
-- Bestandszeilen (Krisenplaene) bekommen 'laufend'. Fuer sie ist der Stand bedeutungslos
-- - ein Krisenplan wird nicht erreicht und ruht nicht -, und der Dienst liest ihn dort
-- auch nie. Ein DEFAULT ist trotzdem noetig, damit NOT NULL beim Nachruesten haelt.
ALTER TABLE selbst_vorhaben
    ADD COLUMN IF NOT EXISTS stand TEXT NOT NULL DEFAULT 'laufend';

ALTER TABLE selbst_vorhaben DROP CONSTRAINT IF EXISTS selbst_vorhaben_stand_check;
ALTER TABLE selbst_vorhaben ADD CONSTRAINT selbst_vorhaben_stand_check
    CHECK (stand IN ('laufend', 'erreicht', 'ruht'));

COMMENT ON COLUMN selbst_vorhaben.stand IS
    'Nur bei art=''ziel'' von Bedeutung. laufend/erreicht/ruht - nie "aufgegeben".';

-- ── 3) Lesen nach Art und Stand ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_selbst_vorhaben_user_art_stand
    ON selbst_vorhaben (user_id, art, stand, created_at DESC);

-- zz_117_kompass.sql
-- "Mein Kompass" - der Raum ueber der Fallebene. Erste Ausbaustufe: Puls und Krisenplan.
--
-- WAS HIER ANDERS IST ALS IM REST DER APP
-- Jede andere Tabelle dieser Datenbank haengt an einem Fall. Diese beiden nicht: Sie
-- gehoeren der PERSON. Das ist der ganze Sinn des Bereichs - den eigenen Zustand
-- festhalten, ohne vorher einen Fall anzulegen oder ein Gespraech zu beginnen.
--
-- DREI GRUNDFORMEN, ZWEI DAVON JETZT
-- Der Bauplan kennt drei Formen: Puls (ein Moment), Satz ueber mich (eine bestaetigte
-- Aussage) und Vorhaben (etwas, das ich mir vornehme). Die Saetze kommen in der zweiten
-- Ausbaustufe; eine leere Tabelle jetzt anzulegen waere totes Schema.
--
-- WERKZEUGE SIND INHALT, KEIN SCHEMA
-- Es gibt hier keine Tabelle je Werkzeug. Der Krisenplan ist ein Vorhaben mit der Art
-- 'krisenplan', sein Aufbau steht im JSONB. Ein neues Werkzeug ist damit ein Katalog-
-- eintrag im Code, keine Migration.
--
-- Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_117_kompass.sql

-- ── Der Puls ────────────────────────────────────────────────────────────────
-- Ein Moment, in fuenf Sekunden erfassbar: ein Zustand, eine Anspannung. Alles Weitere
-- ist freiwillig - ein Puls mit nur einem Zustand ist ein vollstaendiger Puls.
CREATE TABLE IF NOT EXISTS selbst_pulse (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL,                  -- Supabase auth.users.id
    -- 1 = belastet ... 5 = gut. Die Worte dazu stehen im Katalog (kompass_katalog.py),
    -- nicht hier: Beschriftungen aendern sich, Zahlen nicht.
    zustand      SMALLINT    NOT NULL CHECK (zustand BETWEEN 1 AND 5),
    -- Bewusst NULL-bar: Wer nur den Zustand antippt, hat trotzdem etwas festgehalten.
    anspannung   SMALLINT    CHECK (anspannung BETWEEN 0 AND 10),
    -- Schluessel aus dem vorhandenen Wortfeld des Gefuehlsbilds - dieselbe Sprache,
    -- die die Person dort schon kennt.
    worte        JSONB       NOT NULL DEFAULT '[]'::jsonb,
    notiz        TEXT,                                  -- feldverschluesselt
    -- "Was hat heute geholfen?" - wird nur bei guten Zustaenden gefragt und waechst zum
    -- Krisenplan zusammen. Ein Notfallplan, den man im Notfall schreiben soll, entsteht
    -- nie; dieser entsteht nebenbei. Feldverschluesselt.
    geholfen     TEXT,
    -- Optionaler Fallbezug: "das war mit ...". ON DELETE SET NULL, weil der Puls der
    -- Person gehoert und nicht dem Fall - er darf einen geloeschten Fall ueberleben.
    case_id      UUID        REFERENCES cases (id) ON DELETE SET NULL,
    -- clock_timestamp() statt NOW(): NOW() liefert die TRANSAKTIONSZEIT. Zwei Pulse in
    -- derselben Transaktion bekaemen damit denselben Zeitstempel, und die Reihenfolge des
    -- Verlaufs waere beliebig - bei einer Kurve ist die Chronologie aber die Aussage.
    created_at   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Auch fuer bereits angelegte Tabellen (die Zeile oben greift nur beim ersten Lauf).
ALTER TABLE selbst_pulse ALTER COLUMN created_at SET DEFAULT clock_timestamp();

CREATE INDEX IF NOT EXISTS idx_selbst_pulse_user_zeit
    ON selbst_pulse (user_id, created_at DESC);

COMMENT ON TABLE selbst_pulse IS
    'Ein Moment im Kompass: Zustand, Anspannung, optional Worte, Notiz und Fallbezug. '
    'Gehoert der Person, nicht einem Fall.';

-- ── Das Vorhaben ────────────────────────────────────────────────────────────
-- In dieser Ausbaustufe gibt es genau eine Art: den Krisenplan. Weitere Arten (Ziel,
-- Brief an dich selbst) kommen mit ihrer eigenen Migration - die Bedingung unten und das
-- Literal im Code muessen dieselben Worte kennen, sonst faellt erst das INSERT.
CREATE TABLE IF NOT EXISTS selbst_vorhaben (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL,
    art          TEXT        NOT NULL CHECK (art IN ('krisenplan')),
    titel        TEXT,
    -- Der Aufbau steckt im JSONB, nicht in Spalten: {warnzeichen[], schritte[],
    -- menschen[], eigene_nummern[]}. Zeichenketten darin sind feldverschluesselt.
    inhalt       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Einen Krisenplan hat man einmal, nicht dreimal. Als partieller Index, damit spaetere
-- Arten (Ziele, Briefe) beliebig oft vorkommen duerfen.
CREATE UNIQUE INDEX IF NOT EXISTS idx_selbst_vorhaben_ein_krisenplan
    ON selbst_vorhaben (user_id) WHERE art = 'krisenplan';

CREATE INDEX IF NOT EXISTS idx_selbst_vorhaben_user
    ON selbst_vorhaben (user_id, art);

COMMENT ON TABLE selbst_vorhaben IS
    'Etwas, das sich eine Person vornimmt. Erste Art: der Krisenplan.';

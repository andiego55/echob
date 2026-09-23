-- zz_126_briefe.sql
-- "Ein Brief an dich selbst" - die starke Version schreibt fuer die schwaechere.
--
-- WARUM
-- An einem guten Tag schreibt man anders als an einem schlechten. Der Bauplan nutzt das:
-- ein kurzer Brief an das eigene Ich in drei Monaten - "Falls du dann wieder an
-- derselben Stelle stehst ...". Er liegt zu, bis das Datum kommt.
--
-- Und er ist die Antwort auf eine Festlegung: Wir haben Benachrichtigungen
-- ausgeschlossen. Dann muss der Grund zurueckzukommen im Raum selbst liegen - "Es liegt
-- etwas fuer dich da" ist der freundlichste, den eine App haben kann. Dieselbe Mechanik
-- wie beim Krisenplan, und aus demselben Grund.
--
-- WARUM DER TEXT ZU BLEIBT
-- Der Bauplan sagt es ohne Einschraenkung: "Er liegt zu, bis das Datum kommt." Ein Knopf
-- zum Vorabschauen wuerde genau in dem Moment gedrueckt, fuer den der Brief NICHT
-- geschrieben ist - aus Neugier, nicht aus Not. Dann waere er ein Notizzettel.
--
-- Zurueckziehen geht jederzeit (Zeile loeschen). Wer seinen eigenen Text nicht mehr
-- stehen lassen will, muss ihn wegnehmen koennen - und die Auskunft ueber das eigene
-- Konto enthaelt ihn ohnehin, wie jeden anderen Text auch.
--
-- WARUM EIN DATUM UND KEIN ZEITSTEMPEL
-- oeffnet_am ist ein DATE. Ein Brief, der am 3. Maerz um 14:32 aufgeht, weil er vor drei
-- Monaten um 14:32 geschrieben wurde, ist eine Uhr; einer, der am 3. Maerz da ist, ist
-- ein Tag. Der Unterschied ist klein und genau richtig herum.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_126_briefe.sql

CREATE TABLE IF NOT EXISTS selbst_briefe (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL,

    -- Der Brief selbst, feldverschluesselt wie jeder andere eigene Text.
    text         TEXT        NOT NULL,

    -- Der Tag, an dem er aufgeht. Bis dahin geht er nicht nach draussen - das erzwingt
    -- der Dienst, und ein Waechter prueft es ueber den echten Weg.
    oeffnet_am   DATE        NOT NULL,

    -- Wann er zum ersten Mal gelesen wurde. NULL = liegt noch da.
    --
    -- Nicht nur Anzeige: Daran haengt, was auf der Startseite steht. Ein Brief, der
    -- gelesen ist, hoert auf zu warten - sonst stuende dort fuer immer "Es liegt etwas
    -- fuer dich da", und der Satz verloere genau das, was ihn ausmacht.
    gelesen_at   TIMESTAMPTZ,

    -- clock_timestamp(): NOW() waere die Transaktionszeit. Zwei Briefe in derselben
    -- Transaktion trugen dieselbe Zeit, und ihre Reihenfolge waere weg.
    created_at   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE selbst_briefe ALTER COLUMN created_at SET DEFAULT clock_timestamp();

-- Die eine Abfrage, die oft laeuft: "liegt fuer diese Person heute etwas bereit?"
CREATE INDEX IF NOT EXISTS idx_selbst_briefe_wartend
    ON selbst_briefe (user_id, oeffnet_am) WHERE gelesen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_selbst_briefe_user
    ON selbst_briefe (user_id, created_at DESC);

COMMENT ON TABLE selbst_briefe IS
    'Kurze Briefe an das eigene Ich in einigen Monaten. Liegen zu bis oeffnet_am - der '
    'Text darf vorher nicht nach draussen. Dieselbe Mechanik wie der Krisenplan.';

COMMENT ON COLUMN selbst_briefe.text IS
    'Verschluesselt. Geht vor oeffnet_am NICHT nach draussen (kompass_brief_service).';

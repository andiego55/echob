-- zz_140_bilder.sql
-- Die Bildwerkstatt: Lagebilder zu einem Fall.
--
-- Konzept: https://claude.ai/code/artifact/dc994cdb-d9d1-475d-a856-d93e0035d6e1
--
-- EINE TABELLE FUER ZWEI ARTEN VON BILD, VON ANFANG AN
-- Entschieden wurde, beide Wege zu ermoeglichen: gerechnete Bilder (aus den Falldaten, im
-- Browser als SVG) und spaeter erzeugte (von einem Bildmodell gemalt). Die zweite Art gibt es
-- noch nicht - die Spalten dafuer stehen trotzdem schon hier.
--
-- Das kostet jetzt zehn Minuten und erspart eine zweite Migration ueber eine Tabelle, in der
-- dann schon Bilder von Menschen liegen. Und `art` von Anfang an heisst, dass die Abfragen
-- nie umgeschrieben werden muessen, wenn die zweite Art dazukommt.
--
--   art = 'gerechnet'  ->  svg traegt das Bild, bild/bild_typ/prompt sind leer
--   art = 'erzeugt'    ->  bild/bild_typ tragen es, svg ist leer, prompt sagt WORAUS
--
-- WARUM DER PROMPT GESPEICHERT WIRD
-- Er hilft nicht, dasselbe Bild wiederzubekommen - ein Bildmodell malt jedes Mal anders. Er
-- ist die einzige Auskunft darueber, WORAUS das Bild entstanden ist, und bei einem erfundenen
-- Bild ist das die ganze Nachvollziehbarkeit, die es gibt.
--
-- WARUM DAS SVG GESPEICHERT WIRD, OBWOHL ES REPRODUZIERBAR IST
-- Weil es das nur solange ist, wie die Bildsprache unveraendert bleibt. Verbessere ich in
-- drei Monaten eine Anordnung, saehen sonst alle alten Bilder anders aus. Ein Bild, das
-- jemand aufgehoben hat, darf sich nicht aendern, weil ich an einer Formel geschraubt habe -
-- es gehoert ihm, nicht mir.
--
-- Die Einstellungen liegen daneben, damit man ein Bild wieder aufgreifen und variieren kann.
--
-- WAS VERSCHLUESSELT IST
-- Der Satz der Person (ihr eigener Text) und der Prompt. Das SVG auch: Es enthaelt keine
-- Namen und keine Saetze, aber es ist die Form eines Lebens - Zahl, Lage und Dichte der
-- Momente eines Menschen. Es kostet nichts, es wie jeden eigenen Text zu behandeln.
--
-- Die BILDBYTES der zweiten Art NICHT - dieselbe Abwaegung wie bei den Podcast-Tonspuren
-- (siehe zz_136): Feldkrypto auf ein Megabyte bei jedem Abruf kostet Rechenzeit, und die
-- Bytes sind ohnehin nur ueber einen Endpunkt mit Eigentumspruefung erreichbar.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_140_bilder.sql

CREATE TABLE IF NOT EXISTS case_bilder (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id       UUID        NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL,

    art           TEXT        NOT NULL DEFAULT 'gerechnet'
                  CHECK (art IN ('gerechnet', 'erzeugt')),

    -- {"palette":"kuehl","anordnung":"zeit","dichte":"normal","schichten":[...]}
    einstellungen JSONB       NOT NULL DEFAULT '{}'::jsonb,

    -- Art 'gerechnet': das fertige SVG, feldverschluesselt.
    svg           TEXT,

    -- Art 'erzeugt': die Bytes, der Typ, und woraus es entstanden ist.
    bild          BYTEA,
    bild_typ      TEXT,
    prompt        TEXT,

    -- Der Satz der Person unter dem Bild. Feldverschluesselt.
    --
    -- Ein Bild ohne Worte laedt zur Projektion ein: Wer es in einem halben Jahr wiedersieht,
    -- liest hinein, was er gerade fuehlt. Der Satz haelt fest, was er damals gesehen hat.
    satz          TEXT,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_case_bilder_fall
    ON case_bilder (case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_bilder_person
    ON case_bilder (user_id);

COMMENT ON TABLE case_bilder IS
    'Lagebilder zu einem Fall. Zwei Arten: gerechnet (SVG aus den Falldaten) und erzeugt '
    '(von einem Bildmodell). Die zweite ist noch nicht gebaut, die Spalten stehen schon da.';
COMMENT ON COLUMN case_bilder.svg IS
    'Das fertige Bild der Art gerechnet, feldverschluesselt. Mitgespeichert statt neu '
    'gerechnet: Ein aufgehobenes Bild darf sich nicht aendern, weil die Bildsprache '
    'spaeter verbessert wird.';
COMMENT ON COLUMN case_bilder.prompt IS
    'Nur bei der Art erzeugt: woraus das Bild entstanden ist. Hilft nicht, es wieder zu '
    'bekommen - ist aber die einzige Nachvollziehbarkeit, die ein erfundenes Bild hat.';

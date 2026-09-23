-- zz_124_selbstportrait.sql
-- Das Selbstportraet: "Wie sehe ich mich gerade?"
--
-- WAS ES IST
-- Echo schreibt aus den bestaetigten Saetzen, den letzten Pulsen und den offenen
-- Vorhaben einen zusammenhaengenden Text - keine Liste, sondern ein paar Absaetze. Die
-- Person bearbeitet ihn und bestaetigt ihn; danach bleibt er datiert stehen.
--
-- Der Bauplan nennt es "das Ergebnis zum Anfassen" und begruendet, warum es aufbewahrt
-- wird: "Das im Maerz neben dem im September zu lesen, ist die ehrlichste
-- Entwicklungsanzeige, die es gibt." Und es ist die Antwort auf die Frage, die viele vor
-- dem ersten Termin haben: Was soll ich eigentlich sagen?
--
-- WARUM DAS EINE EIGENE TABELLE RECHTFERTIGT
-- Die Regel lautet: kein WERKZEUG bekommt eine eigene Tabelle. Ein Portraet ist keines -
-- es erzeugt weder einen Satz noch ein Vorhaben, sondern ist selbst das Ergebnis. Es hat
-- einen eigenen Lebenslauf (Entwurf -> bearbeitet -> bestaetigt -> bleibt fuer immer),
-- wird ueber Jahre nebeneinandergelegt und ist einzeln freigebbar. Das Komplexitaets-
-- budget sieht "eigene Tabellen" im Kompass ausdruecklich vor; was es verbietet, ist eine
-- Tabelle je Werkzeug.
--
-- WARUM DER TEXT NICHT NACHTRAEGLICH AENDERBAR IST
-- Wie beim Gefuehlsbild: Wer sein Portraet von vor sechs Monaten umschreiben koennte,
-- haette keine Reihe von Momentaufnahmen, sondern eine einzige, die immer schon so war -
-- und damit waere die Entwicklungsanzeige wertlos. Bearbeitet wird der ENTWURF.
--
-- Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_124_selbstportrait.sql

CREATE TABLE IF NOT EXISTS selbst_portraits (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL,

    -- entwurf    = Echos Fassung, von der Person in Arbeit
    -- bestaetigt = steht, datiert, unveraenderlich
    status        TEXT        NOT NULL DEFAULT 'entwurf'
                  CHECK (status IN ('entwurf', 'bestaetigt')),

    -- Der Text selbst, feldverschluesselt. Ein paar Absaetze in der zweiten Person.
    text          TEXT,

    -- clock_timestamp() statt NOW(): NOW() liefert die TRANSAKTIONSZEIT. Zwei Portraets,
    -- die in derselben Transaktion entstehen, bekaemen denselben Zeitstempel - und die
    -- Entwicklungsanzeige zeigte das Spaetere mal ueber und mal unter dem Frueheren.
    -- Dieselbe Entscheidung wie beim Puls, aus demselben Grund: Die Chronologie IST hier
    -- die Aussage.
    created_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    bestaetigt_at TIMESTAMPTZ
);

-- Auch fuer bereits angelegte Tabellen (die Zeilen oben greifen nur beim ersten Lauf).
ALTER TABLE selbst_portraits ALTER COLUMN created_at SET DEFAULT clock_timestamp();
ALTER TABLE selbst_portraits ALTER COLUMN updated_at SET DEFAULT clock_timestamp();

-- Hoechstens EIN Entwurf je Person. Zwei halbfertige Portraets nebeneinander waeren
-- keine Momentaufnahme mehr, und beim naechsten Aufruf wuesste niemand, welches gemeint
-- ist. Dieselbe Entscheidung wie beim Gefuehlsbild.
CREATE UNIQUE INDEX IF NOT EXISTS idx_selbst_portraits_ein_entwurf
    ON selbst_portraits (user_id) WHERE status = 'entwurf';

-- Der Verlauf wird immer nach Person und Bestaetigungsdatum gelesen, neueste zuerst.
CREATE INDEX IF NOT EXISTS idx_selbst_portraits_verlauf
    ON selbst_portraits (user_id, bestaetigt_at DESC) WHERE status = 'bestaetigt';

COMMENT ON TABLE selbst_portraits IS
    'Zusammenhaengender Text ueber die eigene Person, aus Saetzen, Pulsen und Vorhaben. '
    'Datiert und aufbewahrt - nebeneinandergelesen ist es die Entwicklungsanzeige.';

-- ── Das Kontingent ──────────────────────────────────────────────────────────
-- Ein Portraet-Lauf schickt die bestaetigten Saetze, die Pulse der letzten Wochen und
-- die offenen Vorhaben zusammen an das Modell und laesst mehrere Absaetze
-- zurueckschreiben. Das ist der teuerste Knopf im Kompass.
--
-- Gebremst wird er an zwei Stellen, und die zweite ist nicht ueberfluessig: Ob ueberhaupt
-- ein neues Portraet entstehen DARF, entscheidet die Bereitschaft (neue Saetze oder
-- sechs Wochen). Was sie nicht abfaengt, ist "nochmal schreiben" - solange nichts
-- bestaetigt ist, bleibt die Bereitschaft bestehen, und jeder Druck kostet erneut.
--
-- Die Bedingung wird neu gesetzt, weil ein Wort nur in _AI_USAGE_LIMITS nicht reicht:
-- Der Zaehler fiele sonst erst beim INSERT - also NACH dem Modellaufruf, wenn die Arbeit
-- schon bezahlt ist. test_kontingent_arten.py haelt beide Stellen zusammen.
ALTER TABLE ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_kind_check;

ALTER TABLE ai_usage_log
    ADD CONSTRAINT ai_usage_log_kind_check
    CHECK (kind IN ('report', 'scale_calc', 'fall_faq', 'satz_vorschlag',
                    'selbstportrait'));

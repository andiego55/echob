-- zz_130_absprachen.sql
-- Die Absprache: das einzige Element mit ZWEI Bestaetigungen.
--
-- WAS ES IST
-- Der Bauplan: "Die Fachperson schlaegt vor oder die Person schreibt selbst, BEIDE
-- bestaetigen, danach liegt sie bei beiden. Aenderungen brauchen erneut beide."
--
-- Alles andere in EchoB gehoert einer Seite: Die Klient:in schreibt ihre Szenen, die
-- Fachperson ihre Notizen. Dies ist das einzige Stueck, das keiner allein hat - und
-- genau daran haengt sein Wert. Eine Verabredung, die eine Seite allein aendern kann,
-- ist keine.
--
-- WAS ES AUSDRUECKLICH NICHT IST
-- Kein Vertrag im rechtlichen Sinn. Eine Selbstverpflichtung, die niemand einklagen kann
-- und die keine Behandlung ersetzt. Das steht auch im Text an der Oberflaeche, nicht nur
-- hier.
--
-- WARUM EINE AENDERUNG BEIDE BESTAETIGUNGEN ZURUECKSETZT
-- Das ist die eine Regel, die man beim Bauen falsch machen kann, und der Fehler waere
-- unsichtbar: Wer den Text aendert und die alten Haken stehen laesst, hat die Zustimmung
-- der anderen Seite zu einem Text, den sie nie gelesen hat. Es saehe genauso aus wie
-- vorher. Die Spalten werden deshalb beim Aendern geleert - ausser der des Aendernden,
-- denn wer etwas schreibt, stimmt ihm damit zu.
--
-- WARUM BEENDEN EINSEITIG GEHT
-- Zustimmen braucht zwei, Aufhoeren nicht. Eine Selbstverpflichtung, aus der man nur mit
-- Erlaubnis des anderen herauskommt, waere eine Falle - und im Verhaeltnis zwischen
-- Klient:in und Fachperson waere sie das Gegenteil dessen, was sie erreichen soll.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_130_absprachen.sql

CREATE TABLE IF NOT EXISTS absprachen (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Sie haengt am FALL, nicht an der Freigabe: Eine Freigabe kann widerrufen und neu
    -- erteilt werden; was zwei Menschen miteinander verabredet haben, ueberlebt das.
    -- Der ZUGRIFF der Fachperson haengt trotzdem an der aktiven Freigabe - das prueft
    -- der Dienst, nicht diese Tabelle.
    case_id             UUID        NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    owner_user_id       UUID        NOT NULL,
    professional_user_id UUID       NOT NULL,

    -- Der Text, feldverschluesselt wie jeder andere.
    text                TEXT        NOT NULL,

    -- Wer sie eingebracht hat. Nicht Zierde: In einem Gespraech spaeter ist der
    -- Unterschied zwischen "das war mein Vorschlag" und "das war ihrer" erheblich.
    vorgeschlagen_von   TEXT        NOT NULL
                        CHECK (vorgeschlagen_von IN ('klient', 'fachperson')),

    -- Die beiden Bestaetigungen. NULL = steht aus.
    --
    -- Zwei Zeitstempel und kein gemeinsamer Status: Woraus sich "gilt" ergibt, ist eine
    -- Rechnung (beide gesetzt), keine Angabe. Ein zusaetzliches Statusfeld waere eine
    -- zweite Wahrheit, die irgendwann von den Zeitstempeln abweicht.
    bestaetigt_klient_at      TIMESTAMPTZ,
    bestaetigt_fachperson_at  TIMESTAMPTZ,

    -- Beendet: von wem und wann. Einseitig moeglich.
    beendet_at          TIMESTAMPTZ,
    beendet_von         TEXT        CHECK (beendet_von IN ('klient', 'fachperson')),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE absprachen ALTER COLUMN created_at SET DEFAULT clock_timestamp();
ALTER TABLE absprachen ALTER COLUMN updated_at SET DEFAULT clock_timestamp();

-- Gelesen wird immer je Fall und Fachperson, offene zuerst.
CREATE INDEX IF NOT EXISTS idx_absprachen_fall
    ON absprachen (case_id, professional_user_id, created_at DESC);

-- Die laufenden je Person - fuer die Uebersicht auf beiden Seiten.
CREATE INDEX IF NOT EXISTS idx_absprachen_offen
    ON absprachen (owner_user_id) WHERE beendet_at IS NULL;

COMMENT ON TABLE absprachen IS
    'Verabredungen zwischen Klient:in und Fachperson. Gilt erst, wenn BEIDE bestaetigt '
    'haben; eine Aenderung setzt die Bestaetigung der anderen Seite zurueck. Kein '
    'Vertrag im rechtlichen Sinn - eine Selbstverpflichtung.';

COMMENT ON COLUMN absprachen.text IS 'Verschluesselt.';
COMMENT ON COLUMN absprachen.bestaetigt_klient_at IS
    'NULL = steht aus. "Gilt" ist die Rechnung aus beiden Spalten, kein eigenes Feld - '
    'ein zweites Statusfeld waere eine zweite Wahrheit.';

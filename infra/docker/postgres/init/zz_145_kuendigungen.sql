-- ── Der Kuendigungsknopf nach § 312k BGB ────────────────────────────────────
--
-- **Was gefehlt hat.** Seit dem 1. Juli 2022 verlangt § 312k BGB fuer online
-- geschlossene Dauerschuldverhaeltnisse mit Verbrauchern einen Kuendigungsknopf auf der
-- Website: dauerhaft erreichbar, **ohne Anmeldung** benutzbar, mit einer
-- Bestaetigungsseite und einer sofortigen Empfangsbestaetigung in Textform. EchoB hatte
-- nur das Stripe-Portal hinter dem Login.
--
-- Die Folge stand in Absatz 6 und ist unangenehm: Wer den Knopf nicht hat, dessen Kunden
-- koennen **jederzeit fristlos** kuendigen. Dazu das Abmahnrisiko.
--
-- **Warum die Erklaerung in einer eigenen Tabelle liegt und nicht als Mail verpufft.**
-- Absatz 3 verlangt, dass die Kuendigungserklaerung samt Zeitpunkt **speicherbar** ist,
-- und Absatz 4 eine Bestaetigung mit Inhalt, Datum und Uhrzeit des Zugangs. Beides ist
-- ein Nachweis, und ein Nachweis, der nur in einem Postfach liegt, ist im Streitfall
-- keiner. Die Zeile hier ist der Zugangszeitpunkt.
--
-- **Ohne Fremdschluessel auf user_profiles, mit Absicht.** Die Erklaerung muss **ohne
-- Anmeldung** abgegeben werden koennen (Absatz 2). Wer kuendigt, nennt eine E-Mail und
-- vielleicht einen Namen; ob dazu ein Konto existiert, stellt sich erst danach heraus.
-- Eine Kuendigung an eine Kennung zu binden, die wir in diesem Moment nicht kennen,
-- hiesse, sie abzuweisen - und das ist genau das, was die Norm verhindern will.
--
-- Idempotent, bei bestehender DB einmalig einspielen.

CREATE TABLE IF NOT EXISTS kuendigungen (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Absatz 2 Satz 3 Nr. 1: Art der Kuendigung. 'ausserordentlich' verlangt einen Grund.
    art             TEXT NOT NULL CHECK (art IN ('ordentlich', 'ausserordentlich')),
    grund           TEXT,

    -- Nr. 2: Bezeichnung des Vertrags, so wie die kuendigende Person ihn nennt. Freitext
    -- und nicht eine Auswahlliste: Wer sein Abo nicht benennen kann, soll trotzdem
    -- kuendigen koennen.
    vertrag         TEXT NOT NULL,

    -- Nr. 3: Angaben zur eindeutigen Identifizierbarkeit.
    name            TEXT,
    email           TEXT NOT NULL,
    kennung         TEXT,              -- Kundennummer, Rechnungsnummer, was vorliegt

    -- Nr. 4: Zeitpunkt, zu dem die Kuendigung wirken soll. 'naechstmoeglich' ist der
    -- Normalfall und die Vorauswahl; ein Datum nur, wenn jemand eines nennt.
    wirkung         TEXT NOT NULL CHECK (wirkung IN ('naechstmoeglich', 'datum')),
    wirkung_datum   DATE,

    -- Der Zugangszeitpunkt. Absatz 4 verlangt Datum UND Uhrzeit in der Bestaetigung.
    eingegangen_am  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Betriebsspur: ist die Bestaetigung an die kuendigende Person hinausgegangen?
    bestaetigt_am   TIMESTAMPTZ,

    -- Bearbeitungsstand von Hand. Die Kuendigung WIRKT mit dem Zugang, nicht mit der
    -- Bearbeitung - dieses Feld sagt nur, ob das Abo schon beendet wurde.
    erledigt_am     TIMESTAMPTZ,
    notiz           TEXT,

    ip_address      TEXT,
    user_agent      TEXT
);

COMMENT ON TABLE kuendigungen IS
    'Kuendigungserklaerungen nach § 312k BGB. Ohne Anmeldung abgebbar, deshalb ohne '
    'Fremdschluessel auf ein Konto. Die Kuendigung wirkt mit eingegangen_am, nicht mit '
    'erledigt_am.';

CREATE INDEX IF NOT EXISTS idx_kuendigungen_offen
    ON kuendigungen (eingegangen_am DESC) WHERE erledigt_am IS NULL;
CREATE INDEX IF NOT EXISTS idx_kuendigungen_email
    ON kuendigungen (lower(email), eingegangen_am DESC);

-- 87_couple_reminders.sql
-- Paartherapie: Erinnerungen ausserhalb der App.
--
-- Das Modul ist auf Zuege gebaut - vorschlagen, annehmen, bestaetigen, nachziehen. In der
-- App wird darueber benachrichtigt, aber davon erfaehrt nur, wer die App oeffnet. Genau
-- das ist der Zirkelschluss: Die Meldung, die zum Zurueckkommen bewegen soll, sieht man
-- erst, wenn man zurueckgekommen ist.
--
-- BEWUSSTE ENTSCHEIDUNGEN, die in dieser Tabelle stecken:
--
--   * Opt-in. `email_enabled` steht auf false. Niemand bekommt ungefragt Post - schon gar
--     nicht zu diesem Thema, wo eine Mail im falschen Postfach Schaden anrichten kann.
--   * Je Person UND je Raum. Man kann fuer einen Paarraum erinnert werden wollen und fuer
--     einen anderen nicht.
--   * `last_sent_at` deckelt auf hoechstens eine Mail pro Tag. Eine Mail je Ereignis waere
--     Laerm und wuerde genau das kaputtmachen, was sie erreichen soll.
--
-- Was NICHT hier steht: der Inhalt. Eine Erinnerung sagt, DASS etwas wartet, nie was.
-- Der Text steht im Paarraum, nicht im Postfach.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS couple_reminder_settings (
    couple_id     UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL,
    -- Aus per Vorgabe. Die Zustimmung faellt bewusst im Paarraum, nicht beim Anlegen.
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    -- Wann zuletzt erinnert wurde - der Tagesdeckel haengt daran.
    last_sent_at  TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (couple_id, user_id)
);

-- Der Versandlauf fragt genau danach: wer ist eingeschaltet und lange genug nicht dran.
CREATE INDEX IF NOT EXISTS idx_couple_reminders_faellig
    ON couple_reminder_settings (last_sent_at)
    WHERE email_enabled;

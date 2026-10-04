-- ── Eine Einwilligung widerrufen, ohne das Konto zu loeschen ────────────────
--
-- **Was kaputt war.** Art. 7 Abs. 3 S. 4 DSGVO: „Der Widerruf der Einwilligung muss so
-- einfach sein wie die Erteilung." Erteilt wurde sie mit einem Haekchen im
-- Einwilligungs-Dialog. Widerrufen ging bis zum 04.10.2026 nur ueber **die Loeschung des
-- gesamten Kontos** - der Datenschutz-Bereich bot Export und Loeschung, sonst nichts.
-- Die veroeffentlichte Erklaerung versprach derweil: „Du kannst jede Einwilligung
-- jederzeit mit Wirkung fuer die Zukunft widerrufen."
--
-- **Warum eine eigene Tabelle und kein Kennzeichen auf `user_consents`.** Jene Tabelle ist
-- append-only und protokolliert ERTEILTE Einwilligungen; `get_latest_consent` nimmt die
-- juengste Zeile. Ein Widerruf ist das Gegenteil und gehoert nicht in dieselbe Reihe -
-- sonst waere die juengste Zeile einmal eine Zustimmung und einmal ihre Ruecknahme, und
-- jeder Leser muesste das unterscheiden.
--
-- Auch diese Tabelle ist append-only: Ein Widerruf und eine spaetere erneute Einwilligung
-- sind zwei Ereignisse, und beide sind Nachweis. Wer wieder zustimmt, bekommt eine Zeile
-- mit `aufgehoben_am` - geloescht wird nichts, denn „sie hat damals widerrufen" bleibt
-- wahr.
--
-- **Was ein Widerruf bewirkt.** Fuer `ki_verarbeitung` genau das, was die
-- Datenschutzerklaerung ankuendigt: „stehen die darauf beruhenden Funktionen (Echo-Dialog,
-- Zusammenfassungen, Skalen, Berichte) nicht mehr zur Verfuegung". Die bereits
-- gespeicherten Inhalte bleiben - sie beruhen auf einer anderen Einwilligung und
-- verschwinden mit dem Loeschen von Fall oder Konto.
--
-- Idempotent, bei bestehender DB einmalig einspielen.

CREATE TABLE IF NOT EXISTS einwilligung_widerrufe (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL,

    -- WAS widerrufen wurde. Heute nur eines; die Spalte ist eine Liste, weil die
    -- Entbuendelung der Einwilligungen (sensible Inhalte / KI / Audio / Fachperson)
    -- ansteht und dann weitere Werte dazukommen. Ein neues Wort hier braucht AUCH eine
    -- Zeile in dieser CHECK-Bedingung - in diesem Projekt schon dreimal vergessen.
    was           TEXT NOT NULL CHECK (was IN ('ki_verarbeitung')),

    widerrufen_am TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Gesetzt, wenn die Person spaeter wieder einwilligt. Der Widerruf bleibt stehen.
    aufgehoben_am TIMESTAMPTZ,

    ip_address    TEXT,
    user_agent    TEXT
);

COMMENT ON TABLE einwilligung_widerrufe IS
    'Widerrufe erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO). Append-only; ein erneutes '
    'Einwilligen setzt aufgehoben_am, loescht aber nichts.';

-- Die Abfrage, die vor jedem teuren KI-Aufruf laeuft: gibt es einen OFFENEN Widerruf?
CREATE INDEX IF NOT EXISTS idx_widerrufe_offen
    ON einwilligung_widerrufe (user_id, was) WHERE aufgehoben_am IS NULL;

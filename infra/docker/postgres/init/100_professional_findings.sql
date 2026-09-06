-- 100: Arbeitsmappe — was eine Fachperson aus den Gespraechen mitnimmt.
--
-- **Die Luecke, die das schliesst.** Es gab zwei Ablagen, und beide passen nicht:
--
--   professional_notes   EIN Datensatz je Fall mit sechs festen Textfeldern. Ein Formular,
--                        keine Sammlung. Wer im Mai eine Hypothese fasst und im August
--                        eine zweite, schreibt sie in dasselbe Feld - oder ueberschreibt.
--   echo_summaries       Zusammenfassungen GANZER Gespraeche. Zu grob: Der eine Satz, auf
--                        den es ankam, verschwindet in zwanzig Zeilen Zusammenfassung.
--
-- Dazwischen fehlte das Naheliegende: der einzelne Gedanke, datiert, mit Herkunft, in
-- beliebiger Zahl. Genau das, was case_artifacts fuer die nutzende Person sind - und aus
-- demselben Grund: Erkenntnis entsteht in Stuecken, nicht in Formularfeldern.
--
-- **Warum es Arten gibt und nicht nur Text.** Eine Hypothese, eine Beobachtung und eine
-- Frage fuer das naechste Gespraech sind verschiedene Dinge und altern verschieden. Eine
-- Beobachtung bleibt richtig; eine Hypothese muss sich bewaehren. Ohne Art liesse sich das
-- nicht auseinanderhalten - und genau diese Unterscheidung ist der fachliche Wert.
--
-- **Warum der Status drei Werte hat und nicht zwei.** Bei case_artifacts genuegt
-- aktiv/ueberholt, weil eine Deutung nur altert. Eine Arbeitshypothese kann dagegen etwas,
-- das eine Nutzerdeutung nicht kann: sich BEWAEHREN. 'bestaetigt' und 'verworfen'
-- auseinanderzuhalten ist der Unterschied zwischen einer Notiz und fachlichem Arbeiten -
-- und es ist die Grundlage dafuer, dass Echo eine verworfene Hypothese nicht munter
-- wieder vorschlaegt.
--
-- **Wem das gehoert: der Fachperson, niemandem sonst.** Wie professional_notes. Die
-- nutzende Person sieht davon nichts - es ist Arbeitsmaterial, kein Befund ueber sie. Der
-- Fremdschluessel auf den Fall existiert nur, damit beim Loeschen des Falls nichts
-- zurueckbleibt.
--
-- **Die Herkunft ist kein Fremdschluessel.** Ein Gespraech darf geloescht werden, ohne den
-- Eintrag mitzunehmen - er IST ja der Rueckstand. Genau wie bei case_artifacts.
--
-- Idempotent: mehrfach ausfuehrbar.

CREATE TABLE IF NOT EXISTS professional_findings (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id UUID NOT NULL,
    case_id              UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,

    -- Klartext: Listen sollen ohne Entschluesselung sortierbar bleiben (wie scenes.title).
    title        TEXT NOT NULL,
    -- Der eigentliche Gedanke, ein paar Saetze. Verschluesselt.
    body         TEXT NOT NULL,

    kind         TEXT NOT NULL DEFAULT 'beobachtung' CHECK (kind IN (
        'hypothese',    -- eine tastende Annahme, die sich bewaehren muss
        'beobachtung',  -- etwas Konkretes im Material
        'frage',        -- fuer das naechste Gespraech
        'impuls',       -- ein Gespraechsangebot
        'achtung'       -- Vorsicht: Sicherheit, Scham, heikles Thema
    )),

    status       TEXT NOT NULL DEFAULT 'offen' CHECK (status IN (
        'offen', 'bestaetigt', 'verworfen'
    )),
    -- Wann es sich entschieden hat. NULL, solange es offen ist.
    resolved_at  TIMESTAMPTZ,

    -- Woraus es entstanden ist. Frei, weil das Gespraech verschwinden darf.
    source_session UUID,
    source_message UUID,
    -- Worauf es sich bezieht, in Echos eigener Schreibweise: 'Szene 12', 'Dokument 3'.
    -- Text und nicht Fremdschluessel, weil der Bezug aus einer Antwort stammt und
    -- ungueltig werden darf, ohne den Gedanken mitzunehmen.
    beleg        TEXT,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ein entschiedener Eintrag ohne Datum waere eine zeitlose Behauptung statt einer
    -- Entscheidung von damals. Dieselbe Regel wie bei case_artifacts.
    CONSTRAINT professional_findings_entschieden_hat_datum CHECK (
        (status = 'offen' AND resolved_at IS NULL) OR
        (status <> 'offen' AND resolved_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_prof_findings_fall
    ON professional_findings (professional_user_id, case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prof_findings_offen
    ON professional_findings (professional_user_id, case_id, status);

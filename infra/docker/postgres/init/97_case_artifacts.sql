-- 97: Artefakte — die Essenz aus einem Gespraech.
--
-- **Die Luecke, die das schliesst.** topic_summaries hat UNIQUE (case_id, topic), und
-- case_hypotheses hat UNIQUE (case_id, hypothesis_type). Das sind neun feste Plaetze fuer
-- alles, was jemand in Monaten begreift - und eine zweite Zusammenfassung zum selben Thema
-- UEBERSCHREIBT die erste. Wer im Mai etwas ueber Schuld verstanden hat und im August
-- etwas anderes, hatte nur noch das Zweite. Der freie Echo-Chat legte ueberhaupt nichts ab.
--
-- Artefakte sind die fehlende Sammlung: klein (ein paar Saetze), datiert, beliebig viele.
--
-- **Warum es kein confirmed_by_user gibt.** Ein Artefakt entsteht nur, weil jemand einen
-- Vorschlag bearbeitet und auf Speichern gedrueckt hat. Vorher wird nichts abgelegt. Die
-- Bestaetigung steckt im Ablauf, nicht in einer Spalte - anders als bei Szenen, die auch
-- aus einem gefuehrten Dialog fallen koennen, ohne dass jemand sie durchgesehen hat.
--
-- **Warum status statt loeschen.** Eine Szene ist ein Ereignis: Sie WAR, sie kann nicht
-- falsch werden. Ein Artefakt ist eine Deutung, und Deutungen altern. Wer eines auf
-- 'ueberholt' setzt, loescht nicht, sondern erzeugt Signal: Hier hat sich etwas bewegt.
-- Fuer eine Fachperson ist ein ueberholtes Artefakt oft aufschlussreicher als ein
-- aktuelles - und fuer den Nutzer der seltene Moment, in dem Fortschritt sichtbar wird.
-- Ueberholte fliessen NICHT in den Kontext; Echo erfaehrt nur ihre Zahl.
--
-- **Der Paarbereich ist aussen vor.** Artefakte gibt es im Fall-Echo sowie in Themen-,
-- Hypothesen- und Selbsttest-Dialogen. Nicht im Paarraum: Nichts aus dem eigenen Fall darf
-- einen Weg in die Paartherapie finden, und ein Artefakt waere genau so ein Weg.
--
-- Idempotent: mehrfach ausfuehrbar.

CREATE TABLE IF NOT EXISTS case_artifacts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id       UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id       UUID NOT NULL,

    -- Echos Vorschlag, vom Nutzer bearbeitbar. Klartext: Listen sollen ohne
    -- Entschluesselung sortierbar bleiben, wie bei scenes.title.
    title         TEXT NOT NULL,
    -- Zwei bis vier Saetze. Verschluesselt.
    body          TEXT NOT NULL,

    -- Woraus es entstanden ist. Nicht als Fremdschluessel: Das Gespraech darf geloescht
    -- oder zurueckgesetzt werden, ohne das Artefakt mitzunehmen - es IST ja der Rueckstand.
    source_thread  TEXT,
    source_session UUID,

    status        TEXT NOT NULL DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'ueberholt')),
    -- Wann es aufgehoert hat zu stimmen. NULL, solange es gilt.
    superseded_at TIMESTAMPTZ,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ein Artefakt ohne Datum waere im Prompt eine zeitlose Eigenschaft ("Du bist X")
    -- statt einer Aussage von damals. Genau diese Verwechslung soll es nicht geben.
    CONSTRAINT case_artifacts_ueberholt_hat_datum CHECK (
        (status = 'aktiv'     AND superseded_at IS NULL) OR
        (status = 'ueberholt' AND superseded_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_case_artifacts_case ON case_artifacts (case_id, status);
CREATE INDEX IF NOT EXISTS idx_case_artifacts_neu
    ON case_artifacts (case_id, created_at DESC);

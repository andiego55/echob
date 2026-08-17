-- 76_couple_proposals.sql
-- Paartherapie Phase 3: Dialogvorschlag, Annahme, Verabredung + Vorbereitungs-Assistent.
--
-- Ein Vorschlag ist keine eigene Entität, sondern die Sitzung in einem früheren Zustand:
--   draft (in Vorbereitung, nur bei mir) -> proposed (vorgeschlagen) -> open (läuft) -> closed.
-- Die andere Person nimmt an (accepted_by/_at) oder lehnt ab (declined_at); danach kann eine
-- Verabredung mit Zeitpunkt gesetzt werden (scheduled_for). So bleibt alles an einem Objekt.
--
-- Der Vorbereitungs-Assistent legt zwei kleine Felder am Kontext-Beitrag ab:
--   mood         – Stimmungs-Check vor dem Gespräch (Kürzel, unverschlüsselt, keine Aussage
--                  über Inhalte; beide sehen ihn, das ist der Sinn).
--   appreciation – eine Wertschätzung für die andere Person (feldverschlüsselt).
--
-- Idempotent (ADD COLUMN IF NOT EXISTS; CHECK wird ersetzt).

ALTER TABLE couple_sessions ADD COLUMN IF NOT EXISTS proposed_at   TIMESTAMPTZ;
ALTER TABLE couple_sessions ADD COLUMN IF NOT EXISTS accepted_by   UUID;
ALTER TABLE couple_sessions ADD COLUMN IF NOT EXISTS accepted_at   TIMESTAMPTZ;
ALTER TABLE couple_sessions ADD COLUMN IF NOT EXISTS declined_at   TIMESTAMPTZ;
ALTER TABLE couple_sessions ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Status um 'proposed' erweitern (Constraint wurde inline erzeugt und heißt entsprechend).
ALTER TABLE couple_sessions DROP CONSTRAINT IF EXISTS couple_sessions_status_check;
ALTER TABLE couple_sessions ADD CONSTRAINT couple_sessions_status_check
    CHECK (status IN ('draft', 'proposed', 'open', 'closed'));

ALTER TABLE couple_session_contexts ADD COLUMN IF NOT EXISTS mood         TEXT;
ALTER TABLE couple_session_contexts ADD COLUMN IF NOT EXISTS appreciation TEXT;

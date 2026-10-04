-- ── Vier Einwilligungen, wie versprochen ────────────────────────────────────
--
-- **Was nicht stimmte.** Die veroeffentlichte Datenschutzerklaerung sagt: „Wir holen deine
-- Einwilligungen getrennt nach Zweck ein und protokollieren sie - insbesondere fuer (a)
-- die Verarbeitung deiner sensiblen Reflexionsinhalte, (b) die KI-Verarbeitung
-- einschliesslich Uebermittlung in die USA, (c) eine etwaige Audioaufnahme und (d) eine
-- Freigabe an eine bestimmte Fachperson."
--
-- Gebaut waren drei Haekchen, und (a) und (b) steckten **beide** im Feld `sensitive_ai`.
-- (c) gab es gar nicht. Nur (d) war sauber getrennt (`case_shares.consent_version`).
--
-- Die Folge war nicht bloss ein ungenauer Text: Der versprochene getrennte Widerruf der
-- KI-Einwilligung war technisch unmoeglich - er haette die Einwilligung ins Speichern
-- mitgenommen, und damit die Grundlage fuer alles, was schon da ist.
--
-- **Warum die alte Spalte bleibt.** `user_consents` ist append-only und ein Nachweis. Die
-- Zeilen von vorher haben `sensitive_ai` gesetzt und die neuen Spalten leer - das ist
-- richtig so und darf nicht nachtraeglich „aufgefuellt" werden. Was damals erklaert wurde,
-- war die gebuendelte Zustimmung; eine ausgedachte Aufteilung waere eine Faelschung des
-- Nachweises. Gelesen wird deshalb immer ueber die Fassung (`version`), die dazu sagt,
-- welche Spalten gemeint waren.
--
-- **(c) Audio steht hier, wird aber nicht im Einwilligungs-Dialog erhoben.** Eine
-- Einwilligung soll fuer einen bestimmten Zweck und informiert sein (Art. 4 Nr. 11). An der
-- Tuer abgefragt, wo niemand weiss, ob er je ein Mikrofon benutzt, ist sie beides nicht.
-- Sie wird deshalb beim ERSTEN Aufnahmeversuch eingeholt, direkt an der Sache - und ist
-- die einzige der vier, die man ablehnen kann, ohne etwas zu verlieren: Wer nicht spricht,
-- tippt.
--
-- Idempotent, bei bestehender DB einmalig einspielen.

ALTER TABLE user_consents
    ADD COLUMN IF NOT EXISTS inhalte BOOLEAN,
    ADD COLUMN IF NOT EXISTS ki      BOOLEAN,
    ADD COLUMN IF NOT EXISTS audio   BOOLEAN,
    -- **Wofuer diese Spalte da ist, und sie ist nicht kosmetisch.** `get_latest_consent`
    -- nimmt die JUENGSTE Zeile. Eine Audio-Einwilligung ist aber eine Zeile wie jede
    -- andere - ohne Unterscheidung waere sie nach dem ersten Aufnahmeversuch die
    -- juengste, und der Einwilligungs-Dialog erschiene beim naechsten Laden erneut, weil
    -- sie `privacy_policy` nicht traegt. Genau diese Falle liegt auch bei
    -- `kauf_einwilligungen`, und dort war die Antwort eine eigene Tabelle. Hier genuegt
    -- eine benannte Art, weil beide Zeilen wirklich Einwilligungen sind.
    ADD COLUMN IF NOT EXISTS art TEXT NOT NULL DEFAULT 'zugang';

ALTER TABLE user_consents DROP CONSTRAINT IF EXISTS user_consents_art_check;
ALTER TABLE user_consents
    ADD CONSTRAINT user_consents_art_check CHECK (art IN ('zugang', 'audio'));

COMMENT ON COLUMN user_consents.art IS
    '''zugang'' = der Einwilligungs-Dialog vor der ersten Nutzung; ''audio'' = die '
    'Einwilligung beim ersten Aufnahmeversuch. Ohne diese Unterscheidung haelt die '
    'Abfrage der juengsten Zeile eine Audio-Zustimmung fuer den Zugang.';

COMMENT ON COLUMN user_consents.sensitive_ai IS
    'ALT (Fassungen bis 2026-06-16-v1): gebuendelte Zustimmung zu sensiblen Inhalten UND '
    'KI-Verarbeitung. Ab Fassung 2026-10-04-v2 getrennt in inhalte und ki. Bleibt stehen, '
    'weil der Nachweis festhalten muss, was damals wirklich erklaert wurde.';
COMMENT ON COLUMN user_consents.inhalte IS
    'Art. 9 Abs. 2 lit. a - Verarbeitung der sensiblen Reflexionsinhalte.';
COMMENT ON COLUMN user_consents.ki IS
    'KI-Verarbeitung einschliesslich Uebermittlung in die USA. Einzeln widerrufbar ueber '
    'einwilligung_widerrufe.';
COMMENT ON COLUMN user_consents.audio IS
    'Sprachaufnahme zur Transkription. Wird NICHT im Einwilligungs-Dialog erhoben, sondern '
    'beim ersten Aufnahmeversuch - und ist die einzige, die man folgenlos ablehnen kann.';

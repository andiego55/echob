-- ── Das Kontingent haelt den Platz, waehrend das Modell arbeitet ─────────────
--
-- **Die Luecke, die das schliesst.** Jede teure KI-Aktion lief seit es sie gibt so:
-- pruefen, ob noch Kontingent frei ist -> Modell arbeiten lassen (eine halbe bis zwei
-- Minuten) -> verbuchen. Zwischen Pruefung und Verbuchung stand nichts. Zehn Aufrufe im
-- selben Augenblick sahen alle dasselbe freie Kontingent und liefen alle durch; verbucht
-- wurden danach zehn. Bei einem Monatskontingent von zehn Bildern waren das zwanzig.
--
-- Das war kein theoretischer Fall: Ein doppelter Klick auf „Bild malen" genuegt, und bei
-- einem Bild, das zwei Minuten braucht, ist das Fenster riesig.
--
-- **Was diese Spalte macht.** Ein Aufruf legt seine Zeile jetzt VOR dem Modell an und
-- setzt `vorlaeufig_bis` auf einen Zeitpunkt in der Zukunft. Damit zaehlt er sofort gegen
-- das Kontingent, obwohl noch nichts geliefert ist — ein zweiter, gleichzeitiger Aufruf
-- sieht ihn und prallt ab. Gelingt die Arbeit, wird `vorlaeufig_bis` auf NULL gesetzt:
-- aus der Reservierung wird die Buchung. Scheitert sie, wird die Zeile geloescht, und das
-- Kontingent ist unberuehrt.
--
-- **Warum ein Zeitpunkt und nicht nur ein Kennzeichen.** Stirbt der Prozess mitten im
-- Modellaufruf — Neustart, Absturz, Rebuild —, kann niemand mehr loeschen. Eine
-- Reservierung mit Kennzeichen blieb dann fuer immer stehen und haette jemandem ein
-- Kontingent weggenommen, das er nie verbraucht hat. Eine mit Ablauf verfaellt von selbst:
-- Sie zaehlt, solange sie frisch ist, und wird danach uebersehen. Gezaehlt wird deshalb
--
--   WHERE vorlaeufig_bis IS NULL OR vorlaeufig_bis > NOW()
--
-- also: alles Verbuchte, dazu alles, was gerade laeuft.
--
-- **NULL heisst verbucht.** Alle bestehenden Zeilen sind Buchungen, deshalb ist NULL der
-- richtige Standard — die Spalte laesst sich ohne Umschreiben hinzufuegen, und jede alte
-- Zeile zaehlt weiter wie bisher.
--
-- Idempotent, bei bestehender DB einmalig einspielen.

ALTER TABLE ai_usage_log
    ADD COLUMN IF NOT EXISTS vorlaeufig_bis TIMESTAMPTZ;

COMMENT ON COLUMN ai_usage_log.vorlaeufig_bis IS
    'NULL = verbucht. Sonst: Reservierung, die bis zu diesem Zeitpunkt gegen das '
    'Kontingent zaehlt. Ein abgestuerzter Lauf verfaellt dadurch von selbst.';

-- Der Index trug bisher (user_id, kind) — gezaehlt wird aber immer zusaetzlich ueber
-- created_at (Monatsfenster) und seit heute ueber vorlaeufig_bis. Mit beiden Spalten im
-- Index beantwortet Postgres die Zaehlung ohne Griff in die Tabelle.
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_zaehlung
    ON ai_usage_log (user_id, kind, created_at, vorlaeufig_bis);

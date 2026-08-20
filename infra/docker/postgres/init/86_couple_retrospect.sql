-- 86_couple_retrospect.sql
-- Paartherapie: der Rueckblick ueber Zeit.
--
-- Das Modul zeigt bisher gut, DASS ihr arbeitet - Punkte, Streak, Meilensteine. Es zeigt
-- nirgends, WAS sich veraendert hat. Genau das ist aber der Grund, warum man dranbleibt:
-- Ein Paar merkt Fortschritt selten im Alltag, sondern erst im Vergleich.
--
-- Die Zahlen dafuer liegen alle schon da (Barometer, Check-ins, Sitzungen, Themen,
-- Abmachungen, Wertschaetzungen). Was fehlt, ist Echos Bild darueber - und ein Ort, an dem
-- es bleibt. Deshalb diese Tabelle: Ein Rueckblick wird EINMAL erzeugt und dann gelesen,
-- nicht bei jedem Seitenaufruf neu berechnet (das waere teuer und jedes Mal anders).
--
-- GEMEINSAM, nicht privat: Der Rueckblick entsteht ausschliesslich aus Daten, die ohnehin
-- beide sehen, und handelt von beiden. Wer ihn ausgeloest hat, steht dabei - aber er gehoert
-- dem Paarraum.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS couple_retrospectives (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id    UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    -- Wer ihn angestossen hat. Aendert nichts an der Sichtbarkeit.
    created_by   UUID NOT NULL,
    -- Der betrachtete Zeitraum.
    period_start DATE NOT NULL,
    period_end   DATE NOT NULL,
    -- Echos Text (feldverschluesselt).
    body         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_couple_retrospectives_room
    ON couple_retrospectives (couple_id, created_at DESC);

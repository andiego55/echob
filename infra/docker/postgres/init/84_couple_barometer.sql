-- 84_couple_barometer.sql
-- Paartherapie: das Stimmungsbarometer der Beziehung.
--
-- Ein Regler von 1 bis 10, den jede Person fuer sich stellt und die andere immer sieht.
-- Der niedrigschwelligste Anlass im ganzen Modul: kein Formular, kein Termin, zwei Sekunden.
--
-- ES IST EIN ZUSTAND, KEIN URTEIL. Gefragt wird, wie es DIR gerade mit euch geht - nicht,
-- wie gut die andere Person ihre Sache macht. Die optionale Notiz ist deshalb wichtiger als
-- sie aussieht: Sie verhindert, dass eine niedrige Zahl als stummer Vorwurf im Raum steht.
--
-- ANHAENGEND STATT UEBERSCHREIBEND. Jede Einstellung ist eine neue Zeile; der aktuelle Wert
-- ist schlicht die juengste. Das kostet fast nichts und schenkt uns den Verlauf ueber die
-- Zeit, den das Modul sonst nirgends hat.
--
-- ZEITSTEMPEL: clock_timestamp() statt now(). now() liefert in Postgres die TRANSAKTIONS-
-- zeit - mehrere Zeilen aus derselben Transaktion bekaemen denselben Wert, und "die
-- juengste gewinnt" waere Zufall. clock_timestamp() laeuft innerhalb der Transaktion weiter
-- und macht die Reihenfolge eindeutig.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS couple_barometer_readings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id  UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    -- 1 = weit weg, 10 = sehr verbunden. Die Grenzen aendern sich nicht, deshalb hier
    -- ausnahmsweise ein CHECK in der Datenbank (anders als bei Registries wie THREAD_KINDS).
    value      SMALLINT NOT NULL CHECK (value BETWEEN 1 AND 10),
    -- Ein Satz dazu, woran es gerade liegt (feldverschluesselt). Beide sehen ihn.
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Auch fuer bereits angelegte Tabellen nachziehen (Migration bleibt idempotent).
ALTER TABLE couple_barometer_readings
    ALTER COLUMN created_at SET DEFAULT clock_timestamp();

CREATE INDEX IF NOT EXISTS idx_couple_barometer_latest
    ON couple_barometer_readings (couple_id, user_id, created_at DESC);

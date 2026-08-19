-- 82_couple_rhythm.sql
-- Paartherapie: Rhythmus - woechentlicher Check-in und Nachfrage zu Abmachungen.
--
-- Das Modul war bisher rein reaktiv: Es passiert nur etwas, wenn jemand von sich aus
-- hineinschaut. Damit bleibt es ein "einmal ausprobiert"-Produkt. Diese Migration legt die
-- Grundlage fuer die zwei wiederkehrenden Anlaesse:
--
--   1. Der woechentliche Check-in - fuenf Minuten, drei Fragen, fester Rhythmus.
--   2. Die Nachfrage zu einer Abmachung - "vor einer Woche habt ihr X vereinbart, wie lief's?"
--
-- Beides bleibt im Paarbereich: eigene Tabelle, eigene Spalte, keine Erweiterung fremder
-- App-Tabellen.
--
-- Idempotent.

-- ── Woechentlicher Check-in ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS couple_checkins (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id  UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    -- Montag der Woche - macht "eine Antwort je Person und Woche" erzwingbar.
    week_start DATE NOT NULL,
    -- Stimmungskuerzel wie beim Sitzungs-Check-in (unverschluesselt, keine Aussage
    -- ueber Inhalte; beide sehen es, das ist der Sinn).
    mood       TEXT,
    -- Was war schoen? Was wuenschst du dir? (feldverschluesselt)
    highlight  TEXT,
    wish       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (couple_id, user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_couple_checkins_week
    ON couple_checkins (couple_id, week_start DESC);

-- ── Nachfrage zu Abmachungen ────────────────────────────────────────────────
-- due_at gab es schon im Schema und in der API, aber nichts hat je danach gefragt.
-- reviewed_at haelt fest, dass die Nachfrage beantwortet wurde - sonst wuerde sie
-- endlos wieder auftauchen.
ALTER TABLE couple_agreements ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
-- Ein Satz dazu, wie es gelaufen ist (feldverschluesselt).
ALTER TABLE couple_agreements ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE INDEX IF NOT EXISTS idx_couple_agreements_due
    ON couple_agreements (couple_id, due_at)
    WHERE status = 'active' AND due_at IS NOT NULL AND reviewed_at IS NULL;

-- 78_mediation_bridges.sql
-- Paartherapie: Echos Mediationsvorschlag wird verhandelbar.
--
-- Bisher endete eine Mediation mit Fliesstext. Die darin enthaltenen "Bruecken" (konkrete
-- Vorschlaege) werden jetzt eigene Objekte, an denen das Paar arbeiten kann:
--   uebernehmen -> wird zur Abmachung (couple_agreements, bestehender Mechanismus)
--   aendern     -> Gegenvorschlag; wer zuletzt geaendert hat, steht dabei
--   verwerfen   -> mit Begruendung
--
-- Dazu ein gemeinsamer Diskussionsfaden je Thema: bisher hatte ein Thema nur Perspektiven
-- und Vorschlaege, aber kein Hin und Her.
--
-- Idempotent (CREATE TABLE / ADD COLUMN IF NOT EXISTS).

-- ── Die verhandelbaren Brücken eines Vorschlags ──────────────────────────────
CREATE TABLE IF NOT EXISTS couple_bridges (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id     UUID NOT NULL REFERENCES couple_topics(id) ON DELETE CASCADE,
    -- Reihenfolge im ursprünglichen Vorschlag.
    position     SMALLINT NOT NULL DEFAULT 0,
    title        TEXT,
    body         TEXT NOT NULL,
    -- open = in Verhandlung, accepted = als Abmachung übernommen, dropped = verworfen.
    status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'accepted', 'dropped')),
    -- Wer zuletzt daran geändert hat (NULL = noch im Original von Echo).
    updated_by   UUID,
    -- Begründung beim Verwerfen (feldverschlüsselt).
    note         TEXT,
    -- Die daraus entstandene Abmachung.
    agreement_id UUID REFERENCES couple_agreements(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_bridges_topic
    ON couple_bridges (topic_id, position);

-- ── Gemeinsamer Diskussionsfaden je Thema ────────────────────────────────────
CREATE TABLE IF NOT EXISTS couple_topic_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id   UUID NOT NULL REFERENCES couple_topics(id) ON DELETE CASCADE,
    -- NULL = Echo.
    user_id    UUID,
    role       TEXT NOT NULL CHECK (role IN ('partner', 'echo')),
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_topic_messages_topic
    ON couple_topic_messages (topic_id, created_at);

-- ── Abmachung kennt ihre Herkunft ────────────────────────────────────────────
ALTER TABLE couple_agreements
    ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES couple_topics(id) ON DELETE SET NULL;

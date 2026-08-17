-- 77_mediation_followup.sql
-- Paartherapie: was nach einer Mediation kommt.
--
-- Drei Wege aus dem Vorschlag heraus, alle auf vorhandenen Bausteinen:
--   1. privater Dialog ÜBER das Thema  -> couple_private_messages bekommt topic_id
--   2. Zusammenfassung daraus teilen   -> ganz normale Nachricht/Kontext im Raum
--   3. gemeinsames Gespräch darüber    -> eine normale couple_session mit topic_id
--
-- Der private Dialog haengt bisher an einer Sitzung. Er soll auch an einem Thema haengen
-- koennen: genau eine der beiden Zuordnungen muss gesetzt sein (CHECK). Die
-- Vertraulichkeit aendert sich dadurch nicht - die Abfragen bleiben auf (Scope, user_id)
-- eingeschraenkt.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS; Constraints werden ersetzt).

-- ── 1. Sitzung kann aus einem Mediations-Thema entstehen ─────────────────────
ALTER TABLE couple_sessions
    ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES couple_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_couple_sessions_topic
    ON couple_sessions (topic_id) WHERE topic_id IS NOT NULL;

-- ── 2. Privater Dialog auch zu einem Thema ───────────────────────────────────
ALTER TABLE couple_private_messages
    ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES couple_topics(id) ON DELETE CASCADE;

ALTER TABLE couple_private_messages ALTER COLUMN session_id DROP NOT NULL;

-- Genau ein Bezug: entweder Sitzung oder Thema.
ALTER TABLE couple_private_messages DROP CONSTRAINT IF EXISTS couple_private_scope_check;
ALTER TABLE couple_private_messages ADD CONSTRAINT couple_private_scope_check
    CHECK ((session_id IS NULL) <> (topic_id IS NULL));

CREATE INDEX IF NOT EXISTS idx_couple_private_messages_topic
    ON couple_private_messages (topic_id, user_id, created_at)
    WHERE topic_id IS NOT NULL;

-- 79_couple_companion.sql
-- Paartherapie: der persoenliche Paar-Begleiter (Echo-Dialog zum ganzen Paarraum).
--
-- Bisher haengt ein privater Dialog an einer SITZUNG oder an einem THEMA. Es fehlt der
-- Dialog zum Raum als Ganzem: "Worueber sollten wir eigentlich reden?", "Wie sage ich das?",
-- "Was ist mein Anteil?". Dieser Begleiter kennt beide Welten - den eigenen Fall UND den
-- Stand des Paarraums - und bleibt trotzdem privat.
--
-- Genau deshalb ist er privat: Fallinhalte duerfen nie in einen Raum, den beide lesen.
-- Der Scope-CHECK erlaubt jetzt drei Bezuege, aber weiterhin nur GENAU EINEN.
--
-- Idempotent.

ALTER TABLE couple_private_messages
    ADD COLUMN IF NOT EXISTS couple_id UUID REFERENCES couple_links(id) ON DELETE CASCADE;

ALTER TABLE couple_private_messages DROP CONSTRAINT IF EXISTS couple_private_scope_check;
ALTER TABLE couple_private_messages ADD CONSTRAINT couple_private_scope_check
    CHECK (
        (session_id IS NOT NULL)::int
      + (topic_id   IS NOT NULL)::int
      + (couple_id  IS NOT NULL)::int = 1
    );

CREATE INDEX IF NOT EXISTS idx_couple_private_messages_room
    ON couple_private_messages (couple_id, user_id, created_at)
    WHERE couple_id IS NOT NULL;

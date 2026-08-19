-- 81_couple_echo_threads.sql
-- Paar-Begleiter: aus einem endlosen Faden werden abgeschlossene Gespraeche.
--
-- Bisher war der private Echo-Dialog zum Paarraum EIN langer Verlauf. Kuenftig fuehrt man
-- mehrere Gespraeche, schliesst eines ab, laesst es zusammenfassen und findet die
-- Zusammenfassung auf der Uebersicht wieder - genau das gewohnte EchoB-Vorgehen aus den
-- Themendialogen (Gespraech -> Zusammenfassung -> gespeichert), nur eben im Paarbereich.
--
-- VERTRAULICHKEIT unveraendert: Faeden und Zusammenfassungen gehoeren der Person, die sie
-- gefuehrt hat. Die Partnerperson sieht davon nichts - alle Abfragen bleiben auf
-- (couple_id, user_id) eingeschraenkt.
--
-- Dazu der Verhandlungsverlauf der Mediations-Bruecken: bisher sah man nur, WER zuletzt
-- geaendert hat, nicht die Bewegung dorthin.
--
-- Idempotent.

-- ── Gespraechsfaeden des Begleiters ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS couple_echo_threads (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id  UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    -- Von Echo vorgeschlagen oder selbst gesetzt (feldverschluesselt).
    title      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Gesetzt, sobald das Gespraech abgeschlossen wurde.
    closed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_couple_echo_threads_owner
    ON couple_echo_threads (couple_id, user_id, updated_at DESC);

-- Nachrichten haengen jetzt zusaetzlich an einem Faden. Der Scope-CHECK bleibt
-- unveraendert gueltig: Raum-Nachrichten tragen weiterhin couple_id.
ALTER TABLE couple_private_messages
    ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES couple_echo_threads(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_couple_private_messages_thread
    ON couple_private_messages (thread_id, created_at) WHERE thread_id IS NOT NULL;

-- Bestand: bisherige Raum-Dialoge bekommen je Person einen Faden, damit nichts verschwindet.
INSERT INTO couple_echo_threads (couple_id, user_id, created_at, updated_at)
SELECT m.couple_id, m.user_id, MIN(m.created_at), MAX(m.created_at)
  FROM couple_private_messages m
 WHERE m.couple_id IS NOT NULL AND m.thread_id IS NULL
 GROUP BY m.couple_id, m.user_id;

UPDATE couple_private_messages m
   SET thread_id = t.id
  FROM couple_echo_threads t
 WHERE m.couple_id = t.couple_id
   AND m.user_id = t.user_id
   AND m.thread_id IS NULL
   AND m.couple_id IS NOT NULL;

-- ── Zusammenfassungen (privat, wie der Faden selbst) ─────────────────────────
CREATE TABLE IF NOT EXISTS couple_echo_summaries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id    UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    thread_id    UUID REFERENCES couple_echo_threads(id) ON DELETE SET NULL,
    user_id      UUID NOT NULL,
    title        TEXT,
    summary_text TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_echo_summaries_owner
    ON couple_echo_summaries (couple_id, user_id, created_at DESC);

-- ── Verhandlungsverlauf der Bruecken ─────────────────────────────────────────
-- Je Aenderung wird der VORHERIGE Stand abgelegt. Damit laesst sich der Weg zeigen:
-- Original von Echo -> deine Fassung -> ihre Fassung.
CREATE TABLE IF NOT EXISTS couple_bridge_versions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bridge_id  UUID NOT NULL REFERENCES couple_bridges(id) ON DELETE CASCADE,
    title      TEXT,
    body       TEXT NOT NULL,
    -- NULL = Originalfassung von Echo.
    changed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_bridge_versions_bridge
    ON couple_bridge_versions (bridge_id, created_at);

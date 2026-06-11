-- ── Echo-Chat-Sessions ───────────────────────────────────────────────────────
-- Mehrere getrennte Chats pro Fall (ChatGPT-artige Sidebar im Echo-Dialog).
-- Bestehende 'topic'-Nachrichten werden in eine Session "Früherer Verlauf" migriert.

CREATE TABLE IF NOT EXISTS echo_chat_sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id    UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    title      TEXT,                                       -- NULL = noch unbenannt ("Neuer Chat")
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_echo_chat_sessions_case ON echo_chat_sessions (case_id, updated_at DESC);

ALTER TABLE echo_messages
    ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES echo_chat_sessions (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_echo_messages_session ON echo_messages (session_id, created_at);

-- ── Migration: bestehende topic-Threads in je eine Session überführen ─────────
-- Idempotent: nach dem UPDATE gibt es keine topic-Nachrichten mehr ohne session_id,
-- daher fügt ein erneuter Lauf nichts hinzu.

INSERT INTO echo_chat_sessions (case_id, user_id, title, created_at, updated_at)
SELECT m.case_id, m.user_id, 'Früherer Verlauf', MIN(m.created_at), MAX(m.created_at)
FROM echo_messages m
WHERE m.thread_type = 'topic' AND m.session_id IS NULL AND m.case_id IS NOT NULL
GROUP BY m.case_id, m.user_id;

UPDATE echo_messages m
SET session_id = s.id
FROM echo_chat_sessions s
WHERE m.case_id = s.case_id
  AND m.user_id = s.user_id
  AND m.thread_type = 'topic'
  AND m.session_id IS NULL
  AND s.title = 'Früherer Verlauf';

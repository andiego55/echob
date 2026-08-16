-- 71_couple_private_echo.sql
-- Paartherapie Phase 4: der private, flankierende Echo-Dialog.
--
-- Jede Person hat pro Sitzung einen EIGENEN Dialog mit Echo, den die andere Person NIE
-- sieht. Er ist das Gegenstück zum gemeinsamen Raum: hier darf Echo den EIGENEN Fall der
-- Person kennen und ihr helfen, die gemeinsame Sitzung aus ihrem ganzen Zusammenhang zu
-- betrachten — vorbereiten, sortieren, regulieren, nachbesprechen.
--
-- ABGRENZUNG (wichtig): Nichts aus diesem Dialog fließt automatisch in den gemeinsamen
-- Raum. Will die Person etwas davon einbringen, geht das ausschließlich über den
-- Kontext-Composer (bestätigter Text) oder indem sie es selbst in die Sitzung schreibt.
-- Der Zugriff ist immer auf (session_id, user_id) eingeschränkt.
--
-- Idempotent (CREATE TABLE / INDEX IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS couple_private_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES couple_sessions(id) ON DELETE CASCADE,
    -- Die Person, der dieser Dialog gehört. Niemand sonst bekommt diese Zeilen je zu sehen.
    user_id     UUID NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('user', 'echo')),
    -- 'chat' = laufender Dialog, 'feedback' = angefordertes Selbst-Feedback zur Sitzung.
    kind        TEXT NOT NULL DEFAULT 'chat'
                CHECK (kind IN ('chat', 'feedback')),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_private_messages_owner
    ON couple_private_messages (session_id, user_id, created_at);

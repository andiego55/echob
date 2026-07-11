-- ── Client-Benachrichtigungen (nutzerseitige In-App-Nachrichten) ─────────────
-- Leichter, wiederverwendbarer Kanal, um der nutzenden Person Ereignisse
-- mitzuteilen, die nicht von ihr ausgingen. Erster Fall: eine Fachperson hat die
-- Verbindung beendet ('connection_dissolved'). Bewusst ohne FK auf auth.users
-- (wie professional_invites) — user_id ist die Supabase-User-ID.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS). Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/34_client_notifications.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL,               -- Empfänger:in (nutzende Person)
    kind       TEXT        NOT NULL,               -- z. B. 'connection_dissolved'
    body       TEXT        NOT NULL,               -- fertige, anzeigbare Nachricht
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at    TIMESTAMPTZ                         -- NULL = ungelesen/aktiv
);
CREATE INDEX IF NOT EXISTS idx_client_notifications_user
    ON client_notifications (user_id, created_at DESC);

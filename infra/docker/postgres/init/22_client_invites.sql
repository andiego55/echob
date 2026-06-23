-- ── Klient-Einladungen (Fachperson → Person) ─────────────────────────────────
-- Bisher konnte nur die Klient:in eine Fachperson einladen (professional_invites,
-- inviter = Klient:in). Diese Tabelle ergaenzt die umgekehrte Richtung: die
-- Fachperson erzeugt einen persoenlichen Einladungs-Link (Token) + Kurz-Code und
-- gibt ihn weiter. Nimmt die Person an, wird daraus genau die bestehende
-- professional_invites-Verbindung geschrieben (inviter = Person), sodass der
-- vorhandene Teilen-/Freigabe-Mechanismus unveraendert greift.
--
-- Die Einladung legt KEINEN Fall an und gibt nichts frei – sie stellt nur die
-- Verbindung her. Freigabe + Fall-Aktivierung (Sitz) bleiben getrennt.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS). Manuell einspielen:
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/22_client_invites.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/22_client_invites.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_invites (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    token                TEXT        NOT NULL UNIQUE,   -- langer Zufallswert fuer den Link
    code                 TEXT        NOT NULL UNIQUE,   -- kurzer Code fuer manuelle Eingabe (XXXX-XXXX)
    professional_user_id UUID        NOT NULL,          -- einladende Fachperson
    org_id               UUID,                          -- Praxis (Verantwortliche), denormalisiert
    label                TEXT,                          -- interner Merker der Fachperson (z. B. "Frau M.")
    status               TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'accepted', 'revoked')),
    accepted_user_id     UUID,                          -- Person, die angenommen hat
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at          TIMESTAMPTZ,
    expires_at           TIMESTAMPTZ                     -- optional; NULL = unbegrenzt
);
CREATE INDEX IF NOT EXISTS idx_client_invites_professional ON client_invites (professional_user_id, status);
CREATE INDEX IF NOT EXISTS idx_client_invites_code         ON client_invites (code);

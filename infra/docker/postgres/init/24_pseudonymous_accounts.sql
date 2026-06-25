-- ── Pseudonyme Konten (Anmeldung über eine Fachperson, ohne Klarnamen) ───────
-- Eine von einer Fachperson eingeladene Person kann EchoB pseudonym nutzen:
-- statt echter E-Mail nur ein selbstgewähltes Pseudonym (Handle). Der Login
-- läuft intern über eine synthetische E-Mail {handle}@pseudonym.echo-b.de;
-- EchoB speichert KEINEN Klarnamen und KEINE echte E-Mail. Nur die einladende
-- Fachperson kennt die Person (offline).
--
-- WICHTIG: Das ist Pseudonymität, keine Anonymität – die Inhalte bleiben
-- personenbezogen (DSGVO gilt). Diese Tabelle hält nur Handle + Wiederherstellungs-
-- Code-Hash (kein Klartext-Code, keine echte Identität).
--
-- Idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/24_pseudonymous_accounts.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pseudonymous_accounts (
    user_id            UUID        PRIMARY KEY,      -- Supabase auth.users.id
    handle             TEXT        NOT NULL UNIQUE,  -- Pseudonym (lowercase), Teil der synthet. E-Mail
    recovery_code_hash TEXT        NOT NULL,         -- SHA-256 des Wiederherstellungs-Codes (nie Klartext)
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pseudonymous_accounts_handle ON pseudonymous_accounts (handle);

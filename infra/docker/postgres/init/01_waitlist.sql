-- ──────────────────────────────────────────────────────────────────────────
-- EchoB – Initiales Datenbankschema
-- Wird beim ersten Start des Postgres-Containers automatisch ausgeführt.
-- Danach nur noch durch Migrations-Skripte (02_*, 03_*, ...) erweitern.
-- ──────────────────────────────────────────────────────────────────────────

-- Erweiterung für gen_random_uuid() – in Postgres 13+ eingebaut
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Warteliste ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT        NOT NULL,
    interest    TEXT        CHECK (interest IN ('app', 'coaching', 'fachperson', 'alle')),
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT waitlist_email_unique UNIQUE (email)
);

-- Schneller Zugriff auf die neuesten Einträge (Admin-Ansicht, Export)
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at
    ON waitlist (created_at DESC);

COMMENT ON TABLE waitlist IS
    'Interessenten, die sich für EchoB-Neuigkeiten angemeldet haben.';
COMMENT ON COLUMN waitlist.interest IS
    'Grobe Kategorie: app | coaching | fachperson | alle';
COMMENT ON COLUMN waitlist.note IS
    'Optionaler Freitext (max 1000 Zeichen – Kürzung im API-Layer)';

-- ── Fachpersonen-Verzeichnis: Warteliste (Lead-Generierung) ──────────────────
-- Fachpersonen/Praxen/Coaches tragen sich kostenlos ein, um künftig im EchoB-
-- Verzeichnis für Klient:innen sichtbar zu werden. Öffentliches Formular auf
-- /fachpersonen (kein Login). Einwilligung zur späteren Listung wird mitgespeichert.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS). Manuell einspielen:
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/21_directory_waitlist.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/21_directory_waitlist.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS directory_waitlist (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT        NOT NULL,
    email          TEXT        NOT NULL,
    organization   TEXT,                       -- Praxis / Organisation
    phone          TEXT,
    website        TEXT,
    profession     TEXT,                        -- Berufsgruppe (Kategorie)
    specialization TEXT,                        -- Schwerpunkte (Freitext)
    location       TEXT,                        -- Ort / PLZ
    note           TEXT,
    consent_at     TIMESTAMPTZ,                 -- Einwilligung zur Listung
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT directory_waitlist_email_unique UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_directory_waitlist_created ON directory_waitlist (created_at DESC);

-- ── Öffentliches Fachpersonen-Verzeichnis ("Fachperson finden") ──────────────
-- Register von Paartherapeut:innen, Schematherapeut:innen, Coaches, Berater:innen …
-- Getrennt von professional_profiles (das ist kontogebunden fürs Fall-Kollaborations-
-- Feature). Hier sind die MEISTEN Einträge OHNE Konto (von EchoB recherchiert).
-- Ein Eintrag kann über claimed_by_user_id an ein Fachpersonen-Konto gebunden werden,
-- sobald die Fachperson ihr Profil selbst pflegt.
--
-- Idempotent (IF NOT EXISTS). Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/65_directory.sql
--
-- Stufen (tier): 'researched' = recherchiert, KEINE Zustimmung → Kontakt inaktiv
--                'basic'      = zugestimmt, gelistet, kein Profil → Kontakt aktiv
--                'profile'    = Selfservice-Profil ausgefüllt        → Kontakt aktiv
--                'partner'    = im Partnernetzwerk                    → Kontakt aktiv, hervorgehoben
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS directory_listings (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug               TEXT NOT NULL UNIQUE,              -- SEO-URL: /fachpersonen/<slug>
    claimed_by_user_id UUID,                              -- auth.users.id der besitzenden Fachperson (NULL = unbeansprucht)

    -- Basisdaten (immer vorhanden, aus Recherche) --------------------------------
    display_name       TEXT NOT NULL,
    profession         TEXT NOT NULL,                     -- primäre Kategorie-Slug (paartherapie, coaching, …)
    title              TEXT,                              -- freie Berufsbezeichnung/Qualifikation
    city               TEXT NOT NULL,
    city_slug          TEXT NOT NULL,                     -- normalisiert (kassel, frankfurt-am-main)
    postal_code        TEXT,
    state              TEXT,                              -- Bundesland
    website            TEXT,
    phone              TEXT,
    contact_email      TEXT,                              -- Weiterleitungsziel für Anfragen (nur bei Zustimmung)

    -- Stufe / Sichtbarkeit -------------------------------------------------------
    tier               TEXT NOT NULL DEFAULT 'researched'
                       CHECK (tier IN ('researched', 'basic', 'profile', 'partner')),
    published          BOOLEAN NOT NULL DEFAULT true,     -- Admin-Killswitch (Eintrag verbergen)
    verified           BOOLEAN NOT NULL DEFAULT false,    -- Identität von EchoB geprüft (Vertrauens-Badge)

    -- Reiches Profil (Selfservice, nullable) -------------------------------------
    photo_url          TEXT,
    headline           TEXT,                              -- kurzer Claim/Untertitel
    about              TEXT,                              -- "Über mich"
    approach           TEXT,                              -- "Mein Vorgehen"
    fees               TEXT,                              -- "Honorar"
    focus_areas        TEXT[] NOT NULL DEFAULT '{}',      -- "Schwerpunkte" (freie Tags)
    formats            TEXT[] NOT NULL DEFAULT '{}',      -- Setting: praxis/online/telefon
    languages          TEXT[] NOT NULL DEFAULT '{}',      -- Sprachen
    offers_free_intro  BOOLEAN NOT NULL DEFAULT false,    -- bietet (kostenloses) Erstgespräch
    booking_url        TEXT,                              -- optionaler externer Buchungslink

    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_directory_city_prof   ON directory_listings (city_slug, profession) WHERE published;
CREATE INDEX IF NOT EXISTS idx_directory_profession  ON directory_listings (profession)             WHERE published;
CREATE INDEX IF NOT EXISTS idx_directory_city        ON directory_listings (city_slug)              WHERE published;
CREATE INDEX IF NOT EXISTS idx_directory_tier        ON directory_listings (tier);
CREATE INDEX IF NOT EXISTS idx_directory_claimed     ON directory_listings (claimed_by_user_id);

-- Freitext-Suche über Name/Stadt/Titel (pg_trgm optional; für v1 reicht ILIKE + Index oben).


-- ── Kontakt-/Terminanfragen an gelistete Fachpersonen ────────────────────────
-- Nutzer:in füllt ein kleines Formular; EchoB speichert die Anfrage und leitet sie
-- best-effort per Mail an die Fachperson weiter (+ Bestätigung an die anfragende Person).
CREATE TABLE IF NOT EXISTS directory_contact_requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id       UUID NOT NULL REFERENCES directory_listings (id) ON DELETE CASCADE,
    from_name        TEXT,
    from_email       TEXT NOT NULL,
    from_phone       TEXT,
    message          TEXT,
    preferred_format TEXT,                                -- praxis/online/telefon
    forwarded        BOOLEAN NOT NULL DEFAULT false,      -- wurde die Weiterleitung ausgelöst?
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address       TEXT
);
CREATE INDEX IF NOT EXISTS idx_directory_contact_listing ON directory_contact_requests (listing_id, created_at DESC);

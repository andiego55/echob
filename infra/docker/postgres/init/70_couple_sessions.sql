-- 70_couple_sessions.sql
-- Paartherapie Phase 2: moderierte Sitzungen im Paarraum.
--
-- ISOLATIONSPRINZIP (Fortsetzung von 69):
--   Echo bekommt in einer Sitzung AUSSCHLIESSLICH das, was beide Personen in
--   couple_session_contexts.confirmed_text ausdrücklich bestätigt haben — plus Titel,
--   Ziel und den Sitzungsverlauf. Fall-Inhalte fließen NIE direkt ein.
--
--   draft_text ist ein KI-Entwurf, den NUR die verfassende Person sieht; er wird erst
--   durch Bestätigen zu confirmed_text. source_elements hält für Transparenz fest,
--   welche eigenen Fall-Elemente den Entwurf gespeist haben (nur Etiketten, kein Inhalt).
--   confirmed_text ist im Paarraum für beide sichtbar — es gibt hier keinen verdeckten
--   Kanal (dafür gibt es den privaten Echo und die vertrauliche Mediations-Perspektive).
--
-- Idempotent (CREATE TABLE / INDEX IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS couple_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id   UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    created_by  UUID NOT NULL,
    title       TEXT NOT NULL,
    -- Offener Kontext der Sitzung: Problembeschreibung + Ziel (feldverschlüsselt).
    topic       TEXT,
    goal        TEXT,
    -- draft = in Vorbereitung, open = läuft, closed = abgeschlossen.
    status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'open', 'closed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    opened_at   TIMESTAMPTZ,
    closed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_couple_sessions_couple
    ON couple_sessions (couple_id, created_at DESC);

-- Der Kontext-Beitrag je Person zu einer Sitzung.
CREATE TABLE IF NOT EXISTS couple_session_contexts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES couple_sessions(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    -- KI-Entwurf, nur für die verfassende Person sichtbar (feldverschlüsselt).
    draft_text      TEXT,
    -- Erst das Bestätigen macht Text zum Sitzungs-Kontext (feldverschlüsselt).
    confirmed_text  TEXT,
    -- Nur Element-Etiketten (z. B. 'scenes'), niemals Fall-Inhalte.
    source_elements TEXT[] NOT NULL DEFAULT '{}',
    -- Freie Anweisung an Echo für diese Sitzung (feldverschlüsselt).
    instruction     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at    TIMESTAMPTZ,
    UNIQUE (session_id, user_id)
);

-- Der moderierte Gesprächsverlauf (beide Personen + Echo).
CREATE TABLE IF NOT EXISTS couple_session_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES couple_sessions(id) ON DELETE CASCADE,
    -- NULL = Echo (Moderation); sonst die sprechende Person.
    user_id     UUID,
    role        TEXT NOT NULL CHECK (role IN ('partner', 'echo')),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_session_messages_session
    ON couple_session_messages (session_id, created_at);

-- ── Fachpersonenbereich ──────────────────────────────────────────────────────
-- Rollen (Fachperson), Einladungen, Freigaben (granular), Fachpersonen-Notizen,
-- Fachpersonen-Echo (Sessions/Nachrichten/Zusammenfassungen) und Glossar.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS / ON CONFLICT). Manuell einspielen:
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/08_professional.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/08_professional.sql
--
-- Sicherheitsmodell: Fachpersonen sind NICHT Eigentümer der Falldaten. Zugriff
-- läuft ausschließlich über case_shares (+ case_share_elements) und wird server-
-- seitig geprüft. Widerruf = case_shares.status = 'revoked'.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) Fachpersonen-Profil ───────────────────────────────────────────────────
-- Existenz einer Zeile = der Account ist eine Fachperson.
CREATE TABLE IF NOT EXISTS professional_profiles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL UNIQUE,                 -- Supabase auth.users.id
    display_name TEXT,
    title        TEXT,                                 -- Fachrichtung / Rolle (optional)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_user_id ON professional_profiles (user_id);

-- ── 2) Einladungen an Fachpersonen (per E-Mail) ──────────────────────────────
CREATE TABLE IF NOT EXISTS professional_invites (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_user_id      UUID NOT NULL,                -- nutzende Person, die einlädt
    email                TEXT NOT NULL,                -- immer lowercased speichern
    professional_user_id UUID,                         -- gesetzt, sobald akzeptiert
    status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'accepted')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at          TIMESTAMPTZ,
    UNIQUE (inviter_user_id, email)
);
CREATE INDEX IF NOT EXISTS idx_professional_invites_email   ON professional_invites (email);
CREATE INDEX IF NOT EXISTS idx_professional_invites_inviter ON professional_invites (inviter_user_id);

-- ── 3) Freigaben: ein Fall → eine Fachperson ─────────────────────────────────
CREATE TABLE IF NOT EXISTS case_shares (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id              UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    owner_user_id        UUID NOT NULL,                -- Eigentümer:in des Falls
    professional_user_id UUID NOT NULL,                -- Empfänger-Fachperson
    status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'revoked')),
    message              TEXT,                          -- optionale Nachricht an die Fachperson
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at           TIMESTAMPTZ,
    UNIQUE (case_id, professional_user_id)
);
CREATE INDEX IF NOT EXISTS idx_case_shares_case         ON case_shares (case_id);
CREATE INDEX IF NOT EXISTS idx_case_shares_professional ON case_shares (professional_user_id, status);
CREATE INDEX IF NOT EXISTS idx_case_shares_owner        ON case_shares (owner_user_id);

-- ── 4) Freigegebene Elemente einer Freigabe ──────────────────────────────────
-- element_type='scene' nutzt scene_id; alle anderen Typen haben scene_id = NULL.
CREATE TABLE IF NOT EXISTS case_share_elements (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id     UUID NOT NULL REFERENCES case_shares (id) ON DELETE CASCADE,
    element_type TEXT NOT NULL CHECK (element_type IN (
        'case_info', 'onboarding', 'all_scenes', 'scene',
        'scales', 'reports', 'topic_summaries', 'person_profile', 'self_profile'
    )),
    scene_id     UUID REFERENCES scenes (id) ON DELETE CASCADE,   -- nur bei element_type='scene'
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_share_elements_share ON case_share_elements (share_id);
-- Genau eine Zeile je Kategorie pro Freigabe …
CREATE UNIQUE INDEX IF NOT EXISTS uq_share_element_category
    ON case_share_elements (share_id, element_type) WHERE scene_id IS NULL;
-- … und genau eine Zeile je freigegebener Einzelszene.
CREATE UNIQUE INDEX IF NOT EXISTS uq_share_element_scene
    ON case_share_elements (share_id, scene_id) WHERE scene_id IS NOT NULL;

-- ── 5) Fachpersonen-Notizen (ein strukturiertes Dokument je Fachperson & Fall) ─
CREATE TABLE IF NOT EXISTS professional_notes (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id UUID NOT NULL,
    case_id              UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    first_impressions    TEXT,                          -- Erste Eindrücke
    key_scenes           TEXT,                          -- Wichtige Szenen
    open_questions       TEXT,                          -- Offene Fragen
    conversation_prompts TEXT,                          -- Gesprächsimpulse
    next_steps           TEXT,                          -- Nächste Schritte
    free_text            TEXT,                          -- Freitext
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (professional_user_id, case_id)
);
CREATE INDEX IF NOT EXISTS idx_professional_notes_prof_case ON professional_notes (professional_user_id, case_id);

-- ── 6) Fachpersonen-Echo-Sessions (mehrere Chats je Fall, analog echo_chat_sessions) ─
CREATE TABLE IF NOT EXISTS professional_echo_sessions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id UUID NOT NULL,
    case_id              UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    title                TEXT,                          -- NULL = "Neuer Chat"
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prof_echo_sessions_prof_case
    ON professional_echo_sessions (professional_user_id, case_id, updated_at DESC);

-- ── 7) Fachpersonen-Echo-Nachrichten ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_echo_messages (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id           UUID NOT NULL REFERENCES professional_echo_sessions (id) ON DELETE CASCADE,
    professional_user_id UUID NOT NULL,
    case_id              UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    role                 TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content              TEXT NOT NULL,
    thread_type          TEXT NOT NULL DEFAULT 'case'
                         CHECK (thread_type IN ('case', 'glossary')),
    glossary_slug        TEXT,                          -- nur bei thread_type='glossary'
    metadata             JSONB DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prof_echo_messages_session ON professional_echo_messages (session_id, created_at);

-- ── 8) Fachpersonen-Echo-Zusammenfassungen ───────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_echo_summaries (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id UUID NOT NULL,
    case_id              UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    session_id           UUID REFERENCES professional_echo_sessions (id) ON DELETE SET NULL,
    title                TEXT,
    summary_text         TEXT NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prof_echo_summaries_prof_case
    ON professional_echo_summaries (professional_user_id, case_id, created_at DESC);

-- ── 9) Glossar ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS glossary_terms (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       TEXT NOT NULL UNIQUE,
    term       TEXT NOT NULL,
    definition TEXT NOT NULL,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Glossar-Seed (idempotent). Vorsichtige, nicht-diagnostische Formulierungen.
INSERT INTO glossary_terms (slug, term, definition, sort_order) VALUES
  ('beobachtung', 'Beobachtung',
   'Eine konkrete, überprüfbare Wahrnehmung dessen, was tatsächlich gesagt oder getan wurde – frei von Bewertung oder Deutung. Beispiel: »Sie hat dreimal aufgelegt« statt »Sie ist respektlos«.', 1),
  ('gefuehl', 'Gefühl',
   'Die emotionale Reaktion einer Person auf eine Situation (z. B. Angst, Wut, Trauer, Erleichterung). Gefühle sind weder richtig noch falsch; sie weisen auf dahinterliegende Bedürfnisse hin.', 2),
  ('interpretation', 'Interpretation',
   'Die Bedeutung, die einer Beobachtung zugeschrieben wird. Interpretationen sind Hypothesen, keine Fakten – dieselbe Beobachtung lässt oft mehrere Deutungen zu.', 3),
  ('beduerfnis', 'Bedürfnis',
   'Ein grundlegendes menschliches Anliegen (z. B. Sicherheit, Nähe, Autonomie, Anerkennung), das hinter Gefühlen und Reaktionen steht. Unerfüllte Bedürfnisse zeigen sich oft als wiederkehrende Konflikte.', 4),
  ('grenze', 'Grenze',
   'Die persönliche Linie, die markiert, was für eine Person annehmbar ist und was nicht. Grenzen schützen Bedürfnisse und Werte und dürfen benannt und verteidigt werden.', 5),
  ('verantwortung', 'Verantwortung',
   'Der Anteil an einer Situation, den eine Person tatsächlich beeinflussen kann. Zu unterscheiden von übernommener Verantwortung für das Verhalten oder die Gefühle anderer.', 6),
  ('schuldgefuehl', 'Schuldgefühl',
   'Das innere Erleben, etwas falsch gemacht zu haben. Schuldgefühle können angemessen sein oder durch äußeren Druck erzeugt werden – sie sind kein verlässlicher Beweis für tatsächliches Fehlverhalten.', 7),
  ('grenzueberschreitung', 'Grenzüberschreitung',
   'Eine Situation, in der die Grenze einer Person missachtet wird – etwa durch Übergehen eines klaren Neins, Kontrolle oder Druck. Beschreibt ein beobachtbares Verhalten, keine Diagnose.', 8),
  ('isolation', 'Isolation',
   'Die zunehmende Abnahme von Kontakten und Unterstützung außerhalb einer Beziehung. Kann sich schleichend entwickeln und Wahrnehmung wie Handlungsfähigkeit einschränken.', 9),
  ('selbstzweifel', 'Selbstzweifel',
   'Wiederkehrende Unsicherheit über die eigene Wahrnehmung, Erinnerung oder Bewertung. Verstärkter Selbstzweifel kann Folge anhaltender Verunsicherung in einer Beziehung sein.', 10),
  ('musterhypothese', 'Musterhypothese',
   'Eine vorsichtige Annahme über ein wiederkehrendes Beziehungsmuster, gestützt auf mehrere Szenen. Eine Hypothese bleibt vorläufig und überprüfbar – sie ist kein Urteil und keine Diagnose.', 11)
ON CONFLICT (slug) DO NOTHING;

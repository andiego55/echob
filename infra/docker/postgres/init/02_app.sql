-- ── EchoB Kern-Schema ──────────────────────────────────────────────────────
-- Tabellen: cases, onboarding_answers, scenes, echo_messages, scale_scores, reports
-- Alle Tabellen besitzen eine user_id (Supabase Auth UUID) für Row-Level-Security.
-- Muster-Tags und Skalenwerte werden vorerst als JSONB gespeichert.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Fälle ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cases (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,                            -- Supabase auth.users.id
    relationship_type TEXT NOT NULL CHECK (relationship_type IN (
        'partner', 'ex_partner', 'family', 'friendship',
        'work', 'co_parenting', 'other', 'own_patterns'
    )),
    relationship_status TEXT NOT NULL CHECK (relationship_status IN (
        'together', 'separated', 'cohabiting', 'low_contact',
        'conflict_laden', 'forced_contact', 'uncertain'
    )),
    contact_frequency TEXT NOT NULL CHECK (contact_frequency IN (
        'daily', 'several_per_week', 'occasionally', 'rarely',
        'no_contact', 'organisational_only', 'irregular'
    )),
    main_concern      TEXT,
    archived_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases (user_id);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases (created_at DESC);

-- ── Onboarding-Antworten ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_answers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id          UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id          UUID NOT NULL,
    -- fünf Kernfragen als strukturierte Felder
    relationship_description TEXT,
    typical_scenes           TEXT,
    main_burden              TEXT,
    significant_event        TEXT,
    memorable_scenes         TEXT,
    -- berechnete Ergebnisse (von Echo generiert, vom Nutzer bestätigt)
    distress_score           SMALLINT CHECK (distress_score BETWEEN 1 AND 5),
    safety_status            TEXT CHECK (safety_status IN (
        'none', 'unclear', 'elevated', 'acute'
    )),
    pattern_hypotheses       JSONB,                           -- [{label, confidence, source}]
    completed_at             TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT onboarding_answers_case_id_unique UNIQUE (case_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_case_id ON onboarding_answers (case_id);

-- ── Beziehungsszenen ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scenes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id          UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id          UUID NOT NULL,
    title            TEXT NOT NULL,
    scene_date       DATE,
    description      TEXT,
    user_reaction    TEXT,
    distress_score   SMALLINT CHECK (distress_score BETWEEN 1 AND 5),
    safety_level     TEXT CHECK (safety_level IN (
        'none', 'unclear', 'elevated', 'acute'
    )) DEFAULT 'none',
    pattern_tags     JSONB DEFAULT '[]'::jsonb,               -- ["Schuldumkehr", ...]
    confirmed_by_user BOOLEAN NOT NULL DEFAULT false,
    input_mode       TEXT CHECK (input_mode IN (
        'freetext', 'guided', 'chat'
    )) DEFAULT 'freetext',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenes_case_id ON scenes (case_id);
CREATE INDEX IF NOT EXISTS idx_scenes_user_id ON scenes (user_id);
CREATE INDEX IF NOT EXISTS idx_scenes_scene_date ON scenes (scene_date DESC);

-- ── Echo-Nachrichten ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS echo_messages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id          UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id          UUID NOT NULL,
    role             TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content          TEXT NOT NULL,
    thread_type      TEXT CHECK (thread_type IN (
        'onboarding', 'scene', 'topic', 'glossary', 'report',
        'topic_self', 'topic_person', 'topic_responsibility', 'topic_guilt',
        'blog_beziehungsmuster', 'blog_beobachtung_gefuehl',
        'blog_professionelle_hilfe', 'blog_krisentelefone',
        'hyp_dynamics', 'hyp_clusterb', 'hyp_attachment', 'hyp_trauma', 'hyp_own_role'
    )) DEFAULT 'topic',
    related_scene_id UUID REFERENCES scenes (id) ON DELETE SET NULL,
    metadata         JSONB DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_echo_messages_case_id ON echo_messages (case_id);
CREATE INDEX IF NOT EXISTS idx_echo_messages_created_at ON echo_messages (case_id, created_at);

-- ── Skalenwerte ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scale_scores (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id          UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id          UUID NOT NULL,
    scale_key        TEXT NOT NULL CHECK (scale_key IN (
        'boundary_violation', 'guilt_shifting', 'control_isolation',
        'proximity_distance', 'conflict_escalation',
        'perception_distortion', 'safety_risk'
    )),
    score            NUMERIC(4,2) NOT NULL CHECK (score BETWEEN 0 AND 5),
    scene_count      SMALLINT NOT NULL DEFAULT 0,
    confidence       TEXT CHECK (confidence IN ('low', 'medium', 'high')) DEFAULT 'low',
    source_scene_ids JSONB DEFAULT '[]'::jsonb,
    notes            TEXT,
    calculated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT scale_scores_case_scale_unique UNIQUE (case_id, scale_key)
);

CREATE INDEX IF NOT EXISTS idx_scale_scores_case_id ON scale_scores (case_id);

-- ── Berichte ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id          UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id          UUID NOT NULL,
    report_type      TEXT NOT NULL CHECK (report_type IN (
        'short', 'pattern', 'coaching_prep', 'therapy_prep', 'progress'
    )),
    title            TEXT,
    content          JSONB NOT NULL,                          -- strukturierter Berichtsinhalt
    plain_text       TEXT,                                    -- für PDF-Export
    status           TEXT CHECK (status IN (
        'draft', 'ready', 'archived'
    )) DEFAULT 'draft',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_case_id ON reports (case_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (case_id, created_at DESC);

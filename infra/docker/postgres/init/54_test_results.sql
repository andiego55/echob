-- Migration 54: gespeicherte Selbsttest-Ergebnisse (nutzer-eigen) + Freigabe-Element.
--
-- Selbsttests (/selbsttests) werden clientseitig ausgewertet. Angemeldete Nutzende
-- legen ihr Ergebnis hier im Profil ab (nutzer-eigen, NICHT fall-gebunden – wie
-- user_profiles/self_profile). Anzeige in der Fall-Übersicht + optionale Freigabe an
-- die Fachperson über das Freigabemenü. WICHTIG: Testergebnisse fließen NICHT in den
-- Echo-Kontext ein (weder Nutzer- noch Fachpersonen-Echo) – nur der Dialog ÜBER einen
-- Test (content_<slug>) ist Echo bekannt.
--
-- Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/54_test_results.sql

CREATE TABLE IF NOT EXISTS test_results (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    slug        TEXT NOT NULL,
    title       TEXT NOT NULL,
    category    TEXT,
    result      TEXT NOT NULL,            -- Fernet-verschlüsseltes JSON (TestResult)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_test_results_user ON test_results (user_id);

-- 'test_results' als freigebbares Element ergänzen.
-- Spiegelt: ShareElementType (schemas/professional.py), CATEGORY_ELEMENTS +
-- SHARE_ELEMENT_LABELS (Frontend).
ALTER TABLE case_share_elements DROP CONSTRAINT IF EXISTS case_share_elements_element_type_check;
ALTER TABLE case_share_elements ADD CONSTRAINT case_share_elements_element_type_check
    CHECK (element_type IN (
        'case_info', 'onboarding', 'all_scenes', 'scene',
        'scales', 'reports', 'topic_summaries', 'person_profile', 'self_profile',
        'hypotheses', 'test_results'
    ));

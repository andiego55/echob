-- ── Schema-Sync: Dev-Stand → Init-Skripte ────────────────────────────────────
-- Diese Änderungen wurden in der Dev-DB ad-hoc gemacht, waren aber nie in den
-- Init-Skripten. Idempotent: kann auf bestehenden DBs mehrfach laufen.
-- Bei bestehender DB einmalig einspielen:
--   docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/06_sync_schema.sql

-- 1) Themendialog-Zusammenfassungen (fehlte komplett)
CREATE TABLE IF NOT EXISTS topic_summaries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id      UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id      UUID NOT NULL,
    topic        TEXT NOT NULL CHECK (topic IN (
        'topic_self', 'topic_person', 'topic_responsibility', 'topic_guilt'
    )),
    summary_text TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (case_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_topic_summaries_case_id ON topic_summaries (case_id);

-- 2) Onboarding: Belastungsskala geht bis 10 (nicht 5), Pseudonym der Fallperson
ALTER TABLE onboarding_answers DROP CONSTRAINT IF EXISTS onboarding_answers_distress_score_check;
ALTER TABLE onboarding_answers ADD CONSTRAINT onboarding_answers_distress_score_check
    CHECK (distress_score >= 1 AND distress_score <= 10);

ALTER TABLE onboarding_answers ADD COLUMN IF NOT EXISTS person_name TEXT;

-- 3) Skalen: erweiterte Skalen-Keys und 0–100-Wertebereich
ALTER TABLE scale_scores DROP CONSTRAINT IF EXISTS scale_scores_scale_key_check;
ALTER TABLE scale_scores ADD CONSTRAINT scale_scores_scale_key_check
    CHECK (scale_key IN (
        'boundary_violation', 'guilt_shifting', 'control_isolation',
        'proximity_distance', 'conflict_escalation',
        'perception_distortion', 'safety_risk',
        'personality_openness', 'personality_conscientiousness',
        'personality_extraversion', 'personality_agreeableness',
        'personality_neuroticism',
        'responsibility_deflection', 'cluster_b_traits', 'empathy_deficit'
    ));

ALTER TABLE scale_scores DROP CONSTRAINT IF EXISTS scale_scores_score_check;
ALTER TABLE scale_scores ADD CONSTRAINT scale_scores_score_check
    CHECK (score >= 0 AND score <= 100);

-- NUMERIC(4,2) fasst max. 99.99 → bei Score 100 numeric field overflow
ALTER TABLE scale_scores ALTER COLUMN score TYPE NUMERIC(5,1);

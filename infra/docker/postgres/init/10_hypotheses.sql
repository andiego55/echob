-- ── Hypothesen (dialoggetriebene Fall-Hypothesen) ────────────────────────────
-- Gespeicherte Arbeitshypothesen aus Hypothesen-Dialogen mit Echo (Beziehungs-
-- dynamik, Cluster-B-Spektrum, Bindung, Trauma, Eigenanteil). Analog zu
-- topic_summaries: genau eine bestätigte Zusammenfassung je Hypothesen-Typ und
-- Fall. Tastend, ausdrücklich keine Diagnose. Idempotent.
--
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/10_hypotheses.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/10_hypotheses.sql

CREATE TABLE IF NOT EXISTS case_hypotheses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    hypothesis_type TEXT NOT NULL,
    summary_text    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (case_id, hypothesis_type)
);
CREATE INDEX IF NOT EXISTS idx_case_hypotheses_case ON case_hypotheses (case_id, updated_at DESC);

-- ── echo_messages.thread_type um die Hypothesen-Threads erweitern ────────────
-- Die Hypothesen-Dialoge nutzen thread_type = hyp_* in echo_messages. Bestehende
-- DBs haben die CHECK-Constraint aus 02_app.sql noch ohne diese Werte → erweitern.
-- Idempotent: DROP IF EXISTS + neu anlegen.
ALTER TABLE echo_messages DROP CONSTRAINT IF EXISTS echo_messages_thread_type_check;
ALTER TABLE echo_messages ADD CONSTRAINT echo_messages_thread_type_check CHECK (thread_type IN (
    'onboarding', 'scene', 'topic', 'glossary', 'report',
    'topic_self', 'topic_person', 'topic_responsibility', 'topic_guilt',
    'blog_beziehungsmuster', 'blog_beobachtung_gefuehl',
    'blog_professionelle_hilfe', 'blog_krisentelefone',
    'hyp_dynamics', 'hyp_clusterb', 'hyp_attachment', 'hyp_trauma', 'hyp_own_role'
));

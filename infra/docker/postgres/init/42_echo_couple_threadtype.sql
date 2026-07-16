-- Migration 42: Paar-Echo-Thread (thread_type = 'couple') erlauben.
--
-- Der Studierenden-Bereich bietet eine Paar-Analyse über Fälle mit Partnerperson
-- (primary + partner der Arbeitskopie). Der Dialog liegt in echo_messages mit
-- thread_type = 'couple' (auf dem primary-Fall). Bestehende Enum-Werte + der
-- content_<slug>-Zweig (aus Migration 36) bleiben unverändert erhalten.
-- Idempotent: DROP IF EXISTS + neu anlegen.
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/42_echo_couple_threadtype.sql

ALTER TABLE echo_messages DROP CONSTRAINT IF EXISTS echo_messages_thread_type_check;
ALTER TABLE echo_messages ADD CONSTRAINT echo_messages_thread_type_check CHECK (
    thread_type IN (
        'onboarding', 'scene', 'topic', 'glossary', 'report',
        'topic_self', 'topic_person', 'topic_responsibility', 'topic_guilt',
        'blog_beziehungsmuster', 'blog_beobachtung_gefuehl',
        'blog_professionelle_hilfe', 'blog_krisentelefone',
        'hyp_dynamics', 'hyp_clusterb', 'hyp_attachment', 'hyp_trauma', 'hyp_own_role',
        'couple'
    )
    OR thread_type LIKE 'content\_%'
);

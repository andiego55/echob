-- Migration 48: Rollenspiel-Thread (thread_type = 'roleplay') erlauben.
--
-- Der Studierenden-Bereich bietet ein Rollenspiel, in dem Echo die ratsuchende
-- Person (Klient:in) des Falls spielt. Der Dialog liegt in echo_messages mit
-- thread_type = 'roleplay'. Bestehende Enum-Werte + der content_<slug>-Zweig
-- bleiben erhalten (volle Liste aus Migration 42 + 'roleplay'). Idempotent.
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/48_echo_roleplay_threadtype.sql

ALTER TABLE echo_messages DROP CONSTRAINT IF EXISTS echo_messages_thread_type_check;
ALTER TABLE echo_messages ADD CONSTRAINT echo_messages_thread_type_check CHECK (
    thread_type IN (
        'onboarding', 'scene', 'topic', 'glossary', 'report',
        'topic_self', 'topic_person', 'topic_responsibility', 'topic_guilt',
        'blog_beziehungsmuster', 'blog_beobachtung_gefuehl',
        'blog_professionelle_hilfe', 'blog_krisentelefone',
        'hyp_dynamics', 'hyp_clusterb', 'hyp_attachment', 'hyp_trauma', 'hyp_own_role',
        'couple', 'roleplay'
    )
    OR thread_type LIKE 'content\_%'
);

-- Migration 36: Wissens-Dialoge (content_<slug>-Thread-Types) erlauben.
--
-- Die Reflektier-Brücke von den Wissensseiten öffnet einen Themendialog mit
-- thread_type = 'content_<slug>'. Slugs sind dynamisch (24+ Seiten) → Muster
-- statt Enumeration. Die bestehenden Enum-Werte (topic_/blog_/hyp_) bleiben,
-- damit Bestandsdaten die neu validierte Constraint nicht verletzen.
-- Idempotent: DROP IF EXISTS + neu anlegen.
ALTER TABLE echo_messages DROP CONSTRAINT IF EXISTS echo_messages_thread_type_check;
ALTER TABLE echo_messages ADD CONSTRAINT echo_messages_thread_type_check CHECK (
    thread_type IN (
        'onboarding', 'scene', 'topic', 'glossary', 'report',
        'topic_self', 'topic_person', 'topic_responsibility', 'topic_guilt',
        'blog_beziehungsmuster', 'blog_beobachtung_gefuehl',
        'blog_professionelle_hilfe', 'blog_krisentelefone',
        'hyp_dynamics', 'hyp_clusterb', 'hyp_attachment', 'hyp_trauma', 'hyp_own_role'
    )
    OR thread_type LIKE 'content\_%'
);

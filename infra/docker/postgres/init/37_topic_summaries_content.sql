-- Migration 37: topic_summaries.topic erlaubt content_<slug> (Wissens-Dialoge).
--
-- Die inline-CHECK aus 06_sync_schema.sql liess nur die 4 Kern-Themen zu. Beim
-- Speichern einer Wissens-Dialog-Zusammenfassung (topic = 'content_<slug>')
-- schlug das INSERT daher still fehl. Wir erweitern die Constraint um das Muster.
-- Idempotent: DROP IF EXISTS + neu anlegen (Standard-Name der inline-Column-CHECK).
ALTER TABLE topic_summaries DROP CONSTRAINT IF EXISTS topic_summaries_topic_check;
ALTER TABLE topic_summaries ADD CONSTRAINT topic_summaries_topic_check CHECK (
    topic IN ('topic_self', 'topic_person', 'topic_responsibility', 'topic_guilt')
    OR topic LIKE 'content\_%'
);

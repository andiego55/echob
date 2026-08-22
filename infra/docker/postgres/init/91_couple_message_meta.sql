-- 91_couple_message_meta.sql
-- Paartherapie: Platz fuer die Sicherheits-Markierung an einer Echo-Nachricht.
--
-- WARUM. Der Paar-Begleiter bekommt eine Krisen-Triage, wie sie das Fall-Echo seit jeher
-- hat: Bei akuter Gefahr antwortet nicht Echo, sondern eine feste Hilfemeldung mit
-- Notrufnummern. Dort rahmt die Oberflaeche eine solche Nachricht rot und setzt
-- "Sicherheit zuerst - Hilfe ist erreichbar" darueber.
--
-- Diese Rahmung haengt an `metadata.safety` der gespeicherten Nachricht. Im Fall-Echo gibt
-- es die Spalte (`echo_messages.metadata`), in `couple_private_messages` bisher nicht - die
-- Meldung saehe dort nach einem Neuladen aus wie eine gewoehnliche Deutung.
--
-- Bei genau dieser Nachricht ist die Aufmachung Teil der Wirkung, nicht Schmuck. Eine
-- Spalte ist der guenstigere Preis als eine halbe Loesung.
--
-- Idempotent.

ALTER TABLE couple_private_messages
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

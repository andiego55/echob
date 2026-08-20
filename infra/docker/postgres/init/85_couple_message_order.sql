-- 85_couple_message_order.sql
-- Paartherapie: Reihenfolge von Beitraegen verlaesslich machen.
--
-- now() liefert in Postgres die TRANSAKTIONSzeit. Alle Zeilen, die in derselben
-- Transaktion entstehen, bekommen denselben Zeitstempel - und "ORDER BY created_at"
-- liefert dann eine beliebige Reihenfolge.
--
-- In den Verlaeufen traegt die Reihenfolge Bedeutung: Echo bekommt sie als Gespraechs-
-- verlauf vorgelegt und entscheidet daran, ob es sich einschaltet. Eine vertauschte
-- Reihenfolge ist dort kein Schoenheitsfehler.
--
-- clock_timestamp() laeuft innerhalb der Transaktion weiter und macht die Sortierung
-- eindeutig. Bestehende Zeilen bleiben unangetastet.
--
-- Idempotent.

ALTER TABLE couple_session_messages ALTER COLUMN created_at SET DEFAULT clock_timestamp();
ALTER TABLE couple_private_messages ALTER COLUMN created_at SET DEFAULT clock_timestamp();
ALTER TABLE couple_topic_messages   ALTER COLUMN created_at SET DEFAULT clock_timestamp();

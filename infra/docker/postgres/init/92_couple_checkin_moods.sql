-- 92_couple_checkin_moods.sql
-- Woechentlicher Check-in: mehrere Stimmungen statt einer.
--
-- WARUM. "Wie war die Woche fuer dich?" mit genau einer Antwort zwingt zu einer
-- Entscheidung, die es im echten Erleben nicht gibt. Eine Woche ist selten nur
-- angespannt; sie ist angespannt UND hoffnungsvoll, erschoepft UND dankbar. Genau
-- dieses Nebeneinander ist der interessante Teil - fuer die Partnerperson wie fuer
-- den Rueckblick.
--
-- KOMPATIBILITAET. Die alte Spalte `mood` bleibt und wird weiter mitgeschrieben (der
-- erste Eintrag der Auswahl). Bestandszeilen haben `moods IS NULL` und werden ueber
-- `COALESCE(moods, ARRAY[mood])` gelesen - kein Backfill noetig, nichts geht verloren.
-- Neue Wahrheit ist `moods`; `mood` ist ab jetzt abgeleitet.
--
-- Idempotent.

ALTER TABLE couple_checkins
    ADD COLUMN IF NOT EXISTS moods TEXT[];

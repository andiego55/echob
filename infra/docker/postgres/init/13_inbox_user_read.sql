-- 13_inbox_user_read.sql
-- Lese-Status fürs Klient:innen-Postfach (analog pro_read_at im Profi-Portal).
-- user_read_at = wann die nutzende Person die Zuweisung zuletzt gelesen hat.
-- „ungelesen" = die Fachperson hat etwas getan (Zuweisung erstellt / Nachricht
-- geschrieben), das nach user_read_at liegt → updated_at > user_read_at.

ALTER TABLE professional_assignments ADD COLUMN IF NOT EXISTS user_read_at TIMESTAMPTZ;

-- Bereits geöffnete/bearbeitete Zuweisungen als gelesen markieren, damit nach dem
-- Deploy nicht der ganze Bestand als „neu" erscheint. 'sent' (nie geöffnet) bleibt
-- bewusst ungelesen.
UPDATE professional_assignments
   SET user_read_at = updated_at
 WHERE user_read_at IS NULL
   AND status NOT IN ('draft', 'sent');

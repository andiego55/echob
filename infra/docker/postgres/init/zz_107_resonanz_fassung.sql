-- „Deine Fassung": der Weg von einer wiedererkannten Szene zur eigenen.
--
-- WAS VORHER FALSCH WAR. Aus einer Reaktion plus drei Saetzen wurde mit zwei Klicks eine
-- Fall-Szene. Das ist zu wenig fuer das, was eine Szene in diesem System ist: eine
-- praezise Beschreibung eines Ereignisses, die spaeter in die Musterberechnung geht, in
-- Berichte, und womoeglich einer Fachperson vorgelegt wird.
--
-- Schlimmer als die Ungenauigkeit ist ihre RICHTUNG. Wer eine erfundene Szene liest und
-- direkt danach die eigene aufschreibt, uebernimmt ihre Einzelheiten - das Abendessen, den
-- Witz, das Timing. Die Erinnerung formt sich nach dem Text, den man gerade gelesen hat.
-- Eine geliehene Szene ist schlechter als keine, weil sie sich hinterher nicht mehr von
-- einer erlebten unterscheiden laesst.
--
-- WAS DIESE SPALTE AENDERT. Zwischen „kenne ich" und einer Szene liegt jetzt eine eigene
-- Stufe: dieselben gefuehrten Fragen, die die Szenenerfassung ohnehin stellt, plus eine,
-- die es nur hier gibt - „Was ist bei dir anders als in der Geschichte?". Sie laesst sich
-- nur aus der eigenen Erinnerung beantworten und macht aus der Vorlage eine Kontrastfolie.

ALTER TABLE scene_resonance
    -- Die Antworten auf die gefuehrten Fragen. Freitext, also verschluesselt at rest
    -- (crypto.encrypt_json_strings) - hier steht Beziehungsgeschichte, mehr als in der
    -- kurzen Notiz daneben.
    ADD COLUMN IF NOT EXISTS ausarbeitung      JSONB,
    ADD COLUMN IF NOT EXISTS ausgearbeitet_at  TIMESTAMPTZ;

-- Der alte Freitext heisst jetzt im Frontend „Erster Gedanke" und ist ausdruecklich KEINE
-- Szene mehr, sondern das, was jemand direkt nach dem Lesen notiert hat. Die Spalte bleibt
-- `note`: Ein Umbenennen braeuchte eine Wanderung ohne jeden Gewinn, und der Kommentar hier
-- sagt, was gemeint ist.
COMMENT ON COLUMN scene_resonance.note IS
    'Erster Gedanke direkt nach dem Lesen. Ausdruecklich keine Szene - in der Ausarbeitung '
    'wird er der Person als etwas zu Pruefendes vorgelegt, nicht als Inhalt uebernommen.';

COMMENT ON COLUMN scene_resonance.ausarbeitung IS
    'Antworten auf die gefuehrten Fragen (verschluesselt). Erst hieraus entsteht eine Szene.';

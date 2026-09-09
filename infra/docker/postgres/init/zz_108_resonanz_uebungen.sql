-- Zwei Übungen an einer wiedererkannten Szene, die KEINE Szene werden.
--
-- „Deine Fassung" (zz_107) hat einen engen Zweck: das eigene Ereignis so praezise
-- aufschreiben, dass daraus eine Fall-Szene werden darf. Alles, was daneben liegt, gehoert
-- ausdruecklich nicht hinein - sonst verwaessert der Text, aus dem spaeter Muster gerechnet
-- und Berichte gebaut werden.
--
-- Diese Spalte nimmt das Danebenliegende auf:
--
--   gegenszene  „Wie saehe die Szene aus, wenn es gut gelaufen waere?"
--               Das Produkt ist stark auf der Lastseite und duenn auf der anderen. Die
--               Mustergruppe „Zuwenden" existiert und wird fast nie getroffen, weil
--               niemand aufschreibt, was funktioniert. Diese Frage holt es hervor.
--
--   weiter      „Wie ginge die Geschichte bei dir weiter?"
--               Ein projektives Verfahren im Gewand einer Schreibuebung. Weil es
--               ausdruecklich Fiktion bleibt, entfaellt die Hemmung, ueber sich zu
--               schreiben - und was jemand einer erfundenen Figur zutraut, sagt viel.
--
-- EINE SPALTE, NICHT ZWEI. Beide sind Schreibimpulse derselben Art, und es werden weitere
-- folgen. Zwei TEXT-Spalten haetten zwei Codepfade durch Dienst, Schema, Router und
-- Oberflaeche gezogen; ein JSONB mit gepruefter Schluesselliste zieht einen.
--
-- WARUM NICHT IN `ausarbeitung`. Weil deren Inhalt in den Szenentext wandert. Eine
-- Gegenszene dort waere eine erfundene Verbesserung im Bericht ueber ein reales Ereignis.

ALTER TABLE scene_resonance
    ADD COLUMN IF NOT EXISTS uebungen JSONB;

COMMENT ON COLUMN scene_resonance.uebungen IS
    'Schreibimpulse an der Szene (gegenszene, weiter), verschluesselt. Fliessen in Echos '
    'Kontext, werden aber NIE Teil einer Fall-Szene - siehe resonanz_uebungen.py.';

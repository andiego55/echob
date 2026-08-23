-- 93_demo_scales_0_100.sql
-- Beispielfaelle: Skalenwerte auf die 0-100-Skala heben.
--
-- WARUM. Migration 06 hat den Wertebereich von 0-5 auf 0-100 gehoben. Die Seeds der
-- beiden Beispielfaelle (18, 27) blieben auf der alten Skala: 4.6 statt 92, 3.6 statt 72.
-- Auf der heutigen Skala sind das Werte nahe null. Ein Fall, der als deutliche
-- narzisstische Dynamik erzaehlt wird, zeigte damit ueberall "4 von 100" - und genau
-- diesen Fall sieht jede Fachperson als Erstes in der Spielwiese.
--
-- Die Seeds selbst sind mitkorrigiert; sie greifen aber nur bei einer frischen Datenbank
-- (ON CONFLICT DO NOTHING). Bestandszeilen brauchen dieses Update.
--
-- ENG GEFASST. Nur die beiden bekannten Beispiel-Fall-Ids, und nur Werte <= 5. Ein echter
-- Nutzerfall mit einem tatsaechlichen Wert von 3 darf nicht angefasst werden - deshalb
-- keine Heuristik ueber die ganze Tabelle.
--
-- Idempotent: Nach dem Lauf ist kein Wert mehr <= 5, die Bedingung greift nicht erneut.

UPDATE scale_scores
   SET score = score * 20
 WHERE case_id IN (
         'dec01000-0000-4000-a000-0000000000ca',   -- Beispielfall Lena
         'dec01000-0000-4000-a000-0000000000cb'    -- Partnersicht Marco
       )
   AND score <= 5;

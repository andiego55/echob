-- 95: Musterklassen auf das neue Vokabular ziehen (Altbestand in scenes.pattern_tags).
--
-- Drei der ursprünglich elf Klassen fallen weg:
--   Grenzverletzung      -> Übergriffigkeit   (war ein Oberbegriff neben den eigenen
--                                              Unterfällen: Kontrolle, Isolation und
--                                              Drohung sind alle Grenzverletzungen)
--   Konflikteskalation   -> entfällt          (traf auf fast jede festgehaltene Szene zu
--                                              und trennte damit nichts)
--   Nähe-Distanz-Wechsel -> entfällt          (braucht zwei Zeitpunkte, in einer einzelnen
--                                              Szene nicht beobachtbar; gehört auf die
--                                              Fallebene, aus der Abfolge berechnet)
--
-- Die acht übrigen bleiben unverändert; die neuen Klassen entstehen erst bei künftigen
-- Szenen durch den aktualisierten scene_extraction_prompt.
--
-- Reihenfolge egal: Hier ändert sich kein Schema. Die Migration räumt den Bestand auf,
-- der Backend-Rebuild ändert, was neu geschrieben wird. Beides ist unabhängig.
--
-- Idempotent: Nach dem Lauf trifft die WHERE-Klausel auf keine Zeile mehr zu.

UPDATE scenes
SET pattern_tags = (
        SELECT COALESCE(jsonb_agg(DISTINCT neu), '[]'::jsonb)
        FROM (
            SELECT CASE elem #>> '{}'
                     WHEN 'Grenzverletzung' THEN 'Übergriffigkeit'
                     ELSE elem #>> '{}'
                   END AS neu
            FROM jsonb_array_elements(scenes.pattern_tags) AS elem
            WHERE elem #>> '{}' NOT IN ('Konflikteskalation', 'Nähe-Distanz-Wechsel')
        ) AS uebersetzt
    ),
    updated_at = NOW()
WHERE jsonb_typeof(pattern_tags) = 'array'
  AND pattern_tags ?| ARRAY['Grenzverletzung', 'Konflikteskalation', 'Nähe-Distanz-Wechsel'];

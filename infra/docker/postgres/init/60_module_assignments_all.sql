-- ── Freitextaufgaben + Bewertungsraster für alle drei Marktplatz-Module ───────
-- Ergänzt je Lehrbeispiel-Modul um zwei Freitextaufgaben (eine analytische Tabellen-
-- Aufgabe im „|"-Format + eine Reflexion), jeweils mit eigenem Bewertungsraster.
-- Modul 1 hatte bereits eine Aufgabe (Seed 59); hier kommt die Reflexion dazu.
--
-- Beim Übernehmen über den Marktplatz werden Aufgabe UND Raster mitgeklont
-- (siehe _clone_assignment/_clone_rubric im Backend). Reines Daten-Seed, kein Rebuild.
-- Setzt Seed 58 + 59 voraus. Idempotent (feste UUIDs + ON CONFLICT DO NOTHING).
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/60_module_assignments_all.sql

-- ═════════════════════════════════════════════════════════════════════════════
-- BEWERTUNGSRASTER
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO institute_rubrics (id, institute_id, name, description, criteria) VALUES
-- Modul 1 · Reflexion „Grenze formulieren"
('de401000-0000-4000-a000-0000000000d2', 'de401000-0000-4000-a000-000000000100',
 'Grenze formulieren — Auswertung', 'Für die Reflexionsaufgabe zu Katharinas Grenzsetzung.',
 '[{"key":"k0","name":"Grenzklarheit","description":"Konkreter, respektvoller Ich-Satz ohne Vorwurf.","max_points":4},
   {"key":"k1","name":"Realistische Antizipation","description":"Plausible, beobachtungsnahe Erwartung von Sebastians Reaktion.","max_points":3},
   {"key":"k2","name":"Selbstfürsorge","description":"Wie Katharina bei sich bleibt — ohne Selbstbeschuldigung.","max_points":3},
   {"key":"k3","name":"Haltung","description":"Keine Abwertung des Gegenübers, keine Diagnose.","max_points":2}]'::jsonb),
-- Modul 2 · Tabelle „Zyklus-Landkarte"
('de401000-0000-4000-a000-0000000000d3', 'de401000-0000-4000-a000-000000000100',
 'Zyklus-Landkarte — Auswertung', 'Für die Zuordnung der Szenen zu den Phasen des Beziehungszyklus.',
 '[{"key":"k0","name":"Phasen korrekt zugeordnet","description":"Szenen den Phasen (Idealisierung/Entwertung/Rückzug/Hoovering) treffend zugeordnet.","max_points":4},
   {"key":"k1","name":"Gaslighting erkannt","description":"Gaslighting-Szenen benannt und kurz begründet.","max_points":3},
   {"key":"k2","name":"Wirkung tastend","description":"Wirkung/Funktion beobachtungsnah und ohne Diagnose formuliert.","max_points":3},
   {"key":"k3","name":"Vollständigkeit","description":"Mindestens fünf Szenen.","max_points":2}]'::jsonb),
-- Modul 2 · Reflexion „Warum bleibt Marlene?"
('de401000-0000-4000-a000-0000000000d4', 'de401000-0000-4000-a000-000000000100',
 'Warum bleibt Marlene — Auswertung', 'Für die Reflexion zu Trauma-Bonding und Verlustangst.',
 '[{"key":"k0","name":"Mechanismen benannt","description":"Trauma-Bonding, Verlustangst, Hoovering o.Ä. treffend benannt.","max_points":4},
   {"key":"k1","name":"Belege aus Szenen","description":"Mindestens zwei konkrete Szenen als Beleg.","max_points":3},
   {"key":"k2","name":"Wertschätzende Haltung","description":"Keine Bewertung Marlenes, keine Diagnose über Deniz.","max_points":3}]'::jsonb),
-- Modul 3 · Tabelle „Verfolger-Rückzug-Landkarte"
('de401000-0000-4000-a000-0000000000d5', 'de401000-0000-4000-a000-000000000100',
 'Verfolger-Rückzug-Landkarte — Auswertung', 'Für die Analyse der Pursuer-Distancer-Dynamik.',
 '[{"key":"k0","name":"Muster korrekt zugeordnet","description":"Rückzug bzw. Verfolgung je Szene treffend erkannt.","max_points":4},
   {"key":"k1","name":"Wechselseitigkeit gesehen","description":"Beide Seiten des Musters erfasst, nicht nur eine Person.","max_points":3},
   {"key":"k2","name":"Eigenanteil ohne Selbstbeschuldigung","description":"Tobias'' Anteil gewürdigt, ohne ihn zu beschämen.","max_points":3},
   {"key":"k3","name":"Vollständigkeit","description":"Mindestens fünf Szenen.","max_points":2}]'::jsonb),
-- Modul 3 · Reflexion „Aus der Verfolgerrolle"
('de401000-0000-4000-a000-0000000000d6', 'de401000-0000-4000-a000-000000000100',
 'Aus der Verfolgerrolle — Auswertung', 'Für die Reflexion zu einer alternativen Reaktion.',
 '[{"key":"k0","name":"Muster erkannt","description":"Die Bittsteller-Szene und ihr Mechanismus sind klar benannt.","max_points":3},
   {"key":"k1","name":"Realistische Alternative","description":"Eine glaubwürdige alternative Reaktion, die bei Tobias'' Bedürfnis bleibt.","max_points":4},
   {"key":"k2","name":"Selbstwert","description":"Keine Selbstabwertung; das Nähebedürfnis wird nicht pathologisiert.","max_points":3}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- AUFGABEN
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO institute_assignments (id, institute_id, kind, title, instructions, payload, rubric_id, status) VALUES
-- Modul 1 · Reflexion
('de401000-0000-4000-a000-0000000000a2', 'de401000-0000-4000-a000-000000000100', 'reflection',
 'Reflexion: Eine Grenze formulieren',
 'Wählen Sie eine Szene, in der Katharina eine eigene Grenze übergangen hat (z. B. den zurückgestellten Wunsch nach gemeinsamer Planung oder das Absagen von Treffen mit Freundinnen).

Formulieren Sie einen konkreten, respektvollen Satz, mit dem Katharina ihre Grenze hätte benennen können. Beschreiben Sie anschließend: Welche Reaktion Sebastians halten Sie für wahrscheinlich? Und wie könnte Katharina bei sich bleiben, wenn diese Reaktion kommt?

Bleiben Sie beobachtungsnah und werten Sie Sebastian nicht ab.',
 '{}'::jsonb, 'de401000-0000-4000-a000-0000000000d2', 'published'),
-- Modul 2 · Tabelle
('de401000-0000-4000-a000-0000000000a3', 'de401000-0000-4000-a000-000000000100', 'task',
 'Zyklus-Landkarte: Szene → Phase → Wirkung',
 'Ordnen Sie mindestens fünf Szenen des Falls den Phasen des Beziehungszyklus zu. Schreiben Sie je Szene EINE Zeile und trennen Sie die drei Spalten mit einem senkrechten Strich „|".

Szene / Beobachtung | Phase (Idealisierung / Entwertung / Rückzug / Hoovering) | Mögliche Wirkung / Funktion

Beispiel (eine Zeile):
Nach einer eisigen Woche standen plötzlich Rosen in der Küche und ein gebuchtes Wochenende. | Hoovering | Die große Geste beendet die Kälte, ohne dass das Verletzende besprochen wird — die Bindung bleibt.

Markieren Sie am Ende zusätzlich, in welchen Szenen Sie Gaslighting erkennen, und begründen Sie es in ein bis zwei Sätzen.',
 '{}'::jsonb, 'de401000-0000-4000-a000-0000000000d3', 'published'),
-- Modul 2 · Reflexion
('de401000-0000-4000-a000-0000000000a4', 'de401000-0000-4000-a000-000000000100', 'reflection',
 'Reflexion: Warum bleibt Marlene?',
 'Erklären Sie beobachtungsnah, welche Mechanismen Marlenes Bleiben verständlich machen — zum Beispiel Trauma-Bonding aus dem Wechsel von Strafe und Belohnung, Verlustangst oder die Erleichterung nach dem Hoovering.

Belegen Sie Ihre Erklärung mit mindestens zwei konkreten Szenen aus dem Fall. Verzichten Sie auf Bewertungen Marlenes und auf Diagnosen über Deniz.',
 '{}'::jsonb, 'de401000-0000-4000-a000-0000000000d4', 'published'),
-- Modul 3 · Tabelle
('de401000-0000-4000-a000-0000000000a5', 'de401000-0000-4000-a000-000000000100', 'task',
 'Verfolger-Rückzug-Landkarte',
 'Untersuchen Sie mindestens fünf Szenen des Falls. Schreiben Sie je Szene EINE Zeile und trennen Sie die drei Spalten mit einem senkrechten Strich „|".

Szene / Beobachtung | Rückzug oder Verfolgung? | Denkbarer Eigenanteil / möglicher Ausweg

Beispiel (eine Zeile):
Nach vier Tagen Schweigen entschuldigte sich Tobias für einen Streit, den er nicht begonnen hatte. | Verfolgung | Tobias beendet die Stille durch Selbstaufgabe; ein Ausweg wäre, die Stille ruhig zu benennen, ohne sich zu entschuldigen.

Achten Sie darauf, sowohl Nadines Rückzug als auch Tobias'' Verfolgen zu erfassen — das Muster ist wechselseitig gebaut.',
 '{}'::jsonb, 'de401000-0000-4000-a000-0000000000d5', 'published'),
-- Modul 3 · Reflexion
('de401000-0000-4000-a000-0000000000a6', 'de401000-0000-4000-a000-000000000100', 'reflection',
 'Reflexion: Aus der Verfolgerrolle',
 'Beschreiben Sie eine Szene, in der Tobias zum Bittsteller wird. Skizzieren Sie eine alternative Reaktion, mit der er bei seinem Bedürfnis nach Nähe bleibt, ohne sich für Nadines Rückzug verantwortlich zu machen.

Beschreiben Sie auch, was ihm diese andere Reaktion erschweren könnte. Formulieren Sie so, dass das Nähebedürfnis nicht als Fehler erscheint.',
 '{}'::jsonb, 'de401000-0000-4000-a000-0000000000d6', 'published')
ON CONFLICT (id) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- MODUL-SCHRITTE (Aufgaben ans jeweilige Modul anhängen)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO learning_module_steps (id, module_id, position, kind, title, content, ref_id, payload) VALUES
-- Modul 1: Reflexion nach der bestehenden Aufgabe (Position 4)
('de401000-0000-4000-a000-00000000f105', 'de401000-0000-4000-a000-0000000000f1', 4, 'assignment',
 'Aufgabe: Grenze formulieren', NULL, 'de401000-0000-4000-a000-0000000000a2', '{}'::jsonb),
-- Modul 2: Tabelle (3) + Reflexion (4)
('de401000-0000-4000-a000-00000000f204', 'de401000-0000-4000-a000-0000000000f2', 3, 'assignment',
 'Aufgabe: Zyklus-Landkarte', NULL, 'de401000-0000-4000-a000-0000000000a3', '{}'::jsonb),
('de401000-0000-4000-a000-00000000f205', 'de401000-0000-4000-a000-0000000000f2', 4, 'assignment',
 'Aufgabe: Warum bleibt Marlene?', NULL, 'de401000-0000-4000-a000-0000000000a4', '{}'::jsonb),
-- Modul 3: Tabelle (3) + Reflexion (4)
('de401000-0000-4000-a000-00000000f304', 'de401000-0000-4000-a000-0000000000f3', 3, 'assignment',
 'Aufgabe: Verfolger-Rückzug-Landkarte', NULL, 'de401000-0000-4000-a000-0000000000a5', '{}'::jsonb),
('de401000-0000-4000-a000-00000000f305', 'de401000-0000-4000-a000-0000000000f3', 4, 'assignment',
 'Aufgabe: Aus der Verfolgerrolle', NULL, 'de401000-0000-4000-a000-0000000000a6', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

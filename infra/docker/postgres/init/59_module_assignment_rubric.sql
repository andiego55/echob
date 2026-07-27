-- ── Aufgabe + Bewertungsraster im Demo-Modul 1 (Katharina & Sebastian) ───────
-- Ergänzt das Lehrbeispiel-Modul „Verdeckte Muster erkennen" um einen echten
-- Aufgaben-Schritt (Beobachtungstabelle, beobachtungsnah, ≥5 Beispiele) samt
-- passendem Bewertungsraster. Zeigt Aufgaben-in-Modulen + Raster-Auswertung
-- end-to-end. Die Aufgabenstellung enthält die Freitext-Tabellen-Vorlage (Weg A):
-- Studierende trennen die drei Spalten je Zeile mit senkrechten Strichen „|".
--
-- Setzt Seed 58 voraus (Modul 1 = de401000-…-f1). Reines Daten-Seed, kein Rebuild.
-- Idempotent (feste UUIDs + ON CONFLICT DO NOTHING).
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/59_module_assignment_rubric.sql

-- ── Bewertungsraster (institute_rubrics) ─────────────────────────────────────
INSERT INTO institute_rubrics (id, institute_id, name, description, criteria)
VALUES (
    'de401000-0000-4000-a000-0000000000d1', 'de401000-0000-4000-a000-000000000100',
    'Beobachtungstabelle — Auswertung',
    'Raster für die Aufgabe „Szene → Wirkung → Muster". Bewertet Beobachtungsnähe, Differenzierung und Mustererkennung — bewusst ohne Diagnose-Anspruch.',
    '[
      {"key":"k0","name":"Beobachtungsnähe","description":"Spalte 1 beschreibt konkrete, wertungsfreie Szenen aus dem Fall — keine Deutungen, keine Diagnosen.","max_points":4},
      {"key":"k1","name":"Differenzierte Wirkung","description":"Spalte 2 benennt plausible, tastende Wirkungen auf Sebastian, ohne ihn zu pathologisieren.","max_points":3},
      {"key":"k2","name":"Mustererkennung","description":"Spalte 3 verknüpft Beobachtung und Wirkung zu einem denkbaren aufrechterhaltenden Muster (Funktion/Zyklus).","max_points":4},
      {"key":"k3","name":"Vollständigkeit","description":"Mindestens fünf tragfähige, unterschiedliche Beispiele.","max_points":2},
      {"key":"k4","name":"Sprachliche Klarheit & Haltung","description":"Beobachtungsnahe Sprache, respektvoll, keine Ferndiagnose der abwesenden Person.","max_points":2}
    ]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ── Aufgabe (institute_assignments) mit Freitext-Tabellen-Vorlage + Raster ────
INSERT INTO institute_assignments (id, institute_id, kind, title, instructions, payload, rubric_id, status)
VALUES (
    'de401000-0000-4000-a000-0000000000a1', 'de401000-0000-4000-a000-000000000100',
    'task', 'Beobachtungstabelle: Szene → Wirkung → Muster',
    'Erstellen Sie eine Übersicht mit drei Spalten: (1) konkrete Szene/Beobachtung, (2) mögliche Wirkung auf Sebastian, (3) denkbares aufrechterhaltendes Muster. Arbeiten Sie mit mindestens fünf Beispielen aus dem Fall und formulieren Sie ausschließlich beobachtungsnah — keine Deutungen, keine Diagnosen.

So geben Sie die Tabelle im Antwortfeld ein: Schreiben Sie je Beispiel EINE Zeile und trennen Sie die drei Spalten mit einem senkrechten Strich „|".

Szene / Beobachtung | Mögliche Wirkung auf Sebastian | Denkbares aufrechterhaltendes Muster

Beispiel (eine Zeile):
Nach Katharinas Wunsch nach mehr gemeinsamer Planung zog er sich zwei Tage schweigend zurück. | Sein Rückzug beendet das Gespräch, ohne dass er offen Nein sagen muss. | Katharina lenkt ein und entschuldigt sich — der Rückzug wird belohnt und wiederholt sich.

Fügen Sie so mindestens fünf Zeilen an. Achten Sie darauf, dass Spalte 1 wirklich nur beschreibt, was beobachtbar war.',
    '{}'::jsonb, 'de401000-0000-4000-a000-0000000000d1', 'published')
ON CONFLICT (id) DO NOTHING;

-- ── Als Aufgaben-Schritt an Modul 1 anhängen (nach dem Wissenscheck) ──────────
INSERT INTO learning_module_steps (id, module_id, position, kind, title, content, ref_id, payload)
VALUES (
    'de401000-0000-4000-a000-00000000f104', 'de401000-0000-4000-a000-0000000000f1', 3, 'assignment',
    'Aufgabe: Beobachtungstabelle', NULL, 'de401000-0000-4000-a000-0000000000a1', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

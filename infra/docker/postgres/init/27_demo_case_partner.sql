-- ── Beispiel-Partnerfall (Paar-Analyse): Marco K. ────────────────────────────
-- Die GEGENPERSPEKTIVE zum Lena-Demofall (18_demo_case.sql): dieselbe Beziehung aus
-- Marcos subjektiver Sicht. Erfunden, respektvoll, zur Demonstration der Paar-Analyse
-- (zwei Innensichten nebeneinander). KEINE echten Personendaten.
--
-- Bewusst divergent: Marco erlebt sich als bemüht und kritisiert, deutet eigenen Rückzug
-- als „Raum brauchen", Kontrolle als „Sorge". Die Schilderungen sind subjektiv — das
-- Paar-Echo legt sie allparteilich nebeneinander, ohne Partei zu ergreifen.
--
-- Idempotent (ON CONFLICT DO NOTHING). Klartext-Seed (crypto.decrypt reicht Werte ohne
-- enc:v1:-Präfix durch). Kopplung Lena↔Marco legt demo_service.py pro Fachperson an.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO user_profiles (user_id, display_name)
VALUES ('dec01000-0000-4000-a000-000000000002', 'Beispiel: Marco K.')
ON CONFLICT (user_id) DO NOTHING;

-- ── Fall (Marcos Sicht) ──────────────────────────────────────────────────────
INSERT INTO cases (id, user_id, relationship_type, relationship_status, contact_frequency, main_concern)
VALUES (
    'dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002',
    'ex_partner', 'separated', 'occasionally',
    'Verstehen, warum aus großer Nähe ständige Kritik wurde – und warum ich am Ende als der Schuldige dastehe.'
)
ON CONFLICT (id) DO NOTHING;

-- ── Onboarding (Marcos Sicht) ────────────────────────────────────────────────
INSERT INTO onboarding_answers (
    case_id, user_id, relationship_description, typical_scenes, main_burden,
    significant_event, memorable_scenes, distress_score, safety_status, pattern_hypotheses
)
VALUES (
    'dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002',
    'Knapp drei Jahre mit Lena. Der Anfang war das Beste, was mir je passiert ist. Dann hatte ich zunehmend das Gefühl, nie gut genug zu sein und mich für alles rechtfertigen zu müssen. Seit der Trennung erzählt sie eine Geschichte über mich, in der ich mich nicht wiedererkenne.',
    'Ich suche Nähe und werde zurückgewiesen; wenn ich mich dann zurückziehe, heißt es, ich würde sie bestrafen.',
    'Das Gefühl, der Böse zu sein, obwohl ich mir solche Mühe gegeben habe.',
    'Mein Geburtstag, an dem ihr ein Abend mit ihren Freundinnen wichtiger war als ein ruhiger Abend mit mir.',
    'Ihr ständiges Hinterfragen, die Andeutungen zu gehen, das Gefühl, mich für jede Kleinigkeit erklären zu müssen.',
    4, 'none',
    '[{"label":"Gefühl ständiger Kritik","confidence":"high","source":"onboarding"},{"label":"Rückzug bei Überforderung","confidence":"medium","source":"onboarding"},{"label":"Angst, verlassen zu werden","confidence":"medium","source":"onboarding"}]'::jsonb
)
ON CONFLICT (case_id) DO NOTHING;

-- ── Szenen (~9, Marcos Innensicht; teils dieselben Ereignisse wie bei Lena) ───
INSERT INTO scenes (id, case_id, user_id, title, scene_date, description, user_reaction, distress_score, pattern_tags, confirmed_by_user, input_mode)
VALUES
('dec0b000-0000-4000-a000-000000000001'::uuid, 'dec01000-0000-4000-a000-0000000000cb'::uuid, 'dec01000-0000-4000-a000-000000000002'::uuid,
 'Endlich angekommen', '2022-09-12'::date,
 'Mit Lena war von Anfang an alles intensiv. Ich habe zum ersten Mal jemandem völlig vertraut und wollte einfach keine Zeit verlieren – darum die vielen Nachrichten und Pläne.',
 'Glücklich, verliebt, zum ersten Mal seit langem sicher.', 1, '["Idealisierung"]'::jsonb, true, 'guided'),
('dec0b000-0000-4000-a000-000000000002', 'dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002',
 'Das Essen mit ihren Kollegen', '2022-11-03',
 'Beim Abendessen redete sie sich in etwas hinein, das so nicht stimmte. Im Auto wollte ich ihr nur helfen, das nächste Mal souveräner zu wirken. Sie nahm es gleich persönlich.',
 'Genervt, dass gut gemeinte Rückmeldung sofort als Angriff gilt.', 2, '["Konflikteskalation"]'::jsonb, true, 'guided'),
('dec0b000-0000-4000-a000-000000000003', 'dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002',
 'Immer ihre Freundinnen', '2023-01-22',
 'Nach jedem Treffen mit ihrer besten Freundin war Lena verändert, distanziert, voller neuer Vorwürfe. Ich hatte das Gefühl, gegen diese Frau anzukommen, die mich von Anfang an nicht mochte.',
 'Verunsichert, ausgeschlossen, eifersüchtig auf die Zeit.', 3, '["Nähe-Distanz"]'::jsonb, true, 'guided'),
('dec0b000-0000-4000-a000-000000000004', 'dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002',
 'Das gemeinsame Konto', '2023-02-14',
 'Das Konto war meine Idee, weil ich der Sparsame bin. Wenn ich bei größeren Ausgaben nachfragte, ging es mir um Planung – sie machte sofort ein Machtthema daraus.',
 'Missverstanden; aus Vernunft wird bei ihr Kontrolle.', 2, '["Konflikteskalation"]'::jsonb, true, 'guided'),
('dec0b000-0000-4000-a000-000000000005', 'dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002',
 'Mein Geburtstag', '2023-03-30',
 'Ich wollte einen ruhigen Abend zu zweit. Sie bestand auf einer großen Feier mit ihren Leuten, mit denen ich mich nie wohlfühlte. Dass ich absagte, hat sie mir wochenlang vorgehalten.',
 'Enttäuscht, dass mein Wunsch nichts zählte; dann der Vorwurf.', 4, '["Schuldumkehr"]'::jsonb, true, 'guided'),
('dec0b000-0000-4000-a000-000000000006', 'dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002',
 'Ich brauchte Raum', '2023-04-04',
 'Nach dem Streit war ich so überfordert, dass ich kaum reden konnte. Ich zog mich zurück, um nichts kaputtzumachen. Für sie war mein Schweigen angeblich eine Strafe – dabei wusste ich einfach nicht, wie.',
 'Erschöpft, sprachlos, schuldig wegen meines Rückzugs.', 4, '["Rückzug"]'::jsonb, true, 'guided'),
('dec0b000-0000-4000-a000-000000000007', 'dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002',
 'Das Handy', '2023-07-21',
 'Ich hatte ein ungutes Gefühl und habe auf ihr Handy gesehen. Falsch, ich weiß. Aber ich war unsicher, weil sie so viel von mir zurückhielt. Statt über mein Misstrauen zu reden, ging es nur darum, was ich getan hatte.',
 'Beschämt über mich, gleichzeitig allein mit meiner Unsicherheit.', 3, '["Wahrnehmungsverzerrung"]'::jsonb, true, 'guided'),
('dec0b000-0000-4000-a000-000000000008', 'dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002',
 'Sie droht zu gehen', '2023-11-10',
 'Immer öfter sagte Lena, sie halte das nicht mehr aus und überlege zu gehen. Jedes Mal brach mir das den Boden weg und ich tat alles, damit sie blieb.',
 'Panische Verlustangst, dann tagelange Anspannung.', 5, '["Nähe-Distanz","Verlustangst"]'::jsonb, true, 'guided'),
('dec0b000-0000-4000-a000-000000000009', 'dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002',
 'Die Trennung', '2024-02-18',
 'Dann war es plötzlich vorbei, von einem Tag auf den anderen. Ich habe gebettelt, ja. Ich konnte nicht fassen, dass drei Jahre so enden, und wusste nicht, wohin mit mir.',
 'Fassungslos, verlassen, abwechselnd flehend und wütend.', 4, '["Verlustangst"]'::jsonb, true, 'guided'),
('dec0b000-0000-4000-a000-00000000000a', 'dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002',
 'Ihre Version macht die Runde', '2024-04-05',
 'Über Bekannte höre ich, sie stelle mich als kontrollierend und kalt dar. Ich erkenne mich darin nicht und erzähle nun auch meine Seite, damit nicht nur ihr Bild stehen bleibt.',
 'Ohnmächtig gegen eine Erzählung, die mich zum Täter macht.', 3, '["Wahrnehmungsverzerrung"]'::jsonb, true, 'guided')
ON CONFLICT (id) DO NOTHING;

-- ── Skalen (Marcos Wahrnehmung von Lena) ─────────────────────────────────────
INSERT INTO scale_scores (case_id, user_id, scale_key, score, scene_count, confidence, notes)
VALUES
('dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002', 'guilt_shifting',        3.6, 5, 'medium', 'Marco erlebt sich regelhaft als der Schuldige.'),
('dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002', 'proximity_distance',    3.8, 5, 'medium', 'Erlebt Lenas Rückzüge und Trennungsandrohungen als Liebesentzug.'),
('dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002', 'conflict_escalation',   3.2, 4, 'medium', 'Gut gemeinte Rückmeldungen kippen schnell in Streit.'),
('dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002', 'perception_distortion', 2.8, 3, 'low',    'Fühlt seine Absichten (Sorge, Planung) systematisch umgedeutet.')
ON CONFLICT (case_id, scale_key) DO NOTHING;

-- ── Themen-Zusammenfassungen (Marcos Sicht) ──────────────────────────────────
INSERT INTO topic_summaries (case_id, user_id, topic, summary_text)
VALUES
('dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002', 'topic_self',
 'Marco beschreibt sich als loyal und bemüht, mit ausgeprägter Verlustangst. Eigenen Rückzug deutet er als Selbstschutz bei Überforderung, nicht als Bestrafung. Wenig Sprache für die eigene Rolle in Eskalationen.'),
('dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002', 'topic_person',
 'Lena erscheint ihm zunehmend kritisch, distanziert und durch ihr Umfeld beeinflusst. Ihre Grenzsetzungen und Trennungsandrohungen erlebt er als Druck und Liebesentzug.')
ON CONFLICT (case_id, topic) DO NOTHING;

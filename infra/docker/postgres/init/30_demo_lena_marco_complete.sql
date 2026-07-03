-- ── Demo-Fälle Lena & Marco vervollständigen ─────────────────────────────────
-- Ergänzt zum bestehenden Seed (18_demo_case.sql / 27_demo_case_partner.sql):
--   1. person_name der jeweils anderen Person (für Personenprofil-Echo).
--   2. Personenprofile (Fremdeinschätzung) für BEIDE Fälle — bewusst asymmetrisch:
--      Lena schätzt Marco durchgängig hoch ein; Marco schätzt Lena moderat ein und
--      benennt ansatzweise eigenen Anteil. Genau diese zwei Innensichten zeigt die
--      Paar-Analyse allparteilich nebeneinander.
--   3. Zwei tastende Arbeitshypothesen für Marco (er hatte bisher keine).
--   4. Nachtrag der Freigabe-Scopes (person_profile / hypotheses) für bestehende
--      Demo-Freigaben — sonst sieht die Fachperson die neuen Inhalte nicht.
--
-- Klartext-Seed (crypto.decrypt reicht Werte ohne "enc:v1:"-Präfix durch).
-- Idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/30_demo_lena_marco_complete.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Name der jeweils anderen Person ------------------------------------------
UPDATE onboarding_answers SET person_name = 'Marco'
 WHERE case_id = 'dec01000-0000-4000-a000-0000000000ca' AND person_name IS NULL;
UPDATE onboarding_answers SET person_name = 'Lena'
 WHERE case_id = 'dec01000-0000-4000-a000-0000000000cb' AND person_name IS NULL;

-- 2a. Personenprofil in Lenas Fall: ihre Einschätzung von Marco (hoch) --------
INSERT INTO person_profiles (case_id, user_id, modules, completed_modules)
VALUES (
    'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
    '{
      "emotional_reactions": {"emot_1":4,"emot_2":3,"emot_3":4,"emot_4":4,"emot_5":5,"emotional_volatility":4.0},
      "empathy": {"emp_1":2,"emp_2":4,"emp_3":4,"emp_4":4,"emp_5":5,"empathy_deficit":4.2},
      "self_image": {"self_1":4,"self_2":4,"self_3":5,"self_4":4,"self_5":4,"grandiosity":4.3},
      "manipulation": {"manip_1":5,"manip_2":5,"manip_3":4,"manip_4":3,"manip_5":4,"manipulation_score":4.2},
      "attachment_patterns": {"attach_1":4,"attach_2":5,"attach_3":3,"attach_4":4,"attach_5":5,"attachment_instability":4.2},
      "impulsivity": {"imp_1":3,"imp_2":4,"imp_3":4,"imp_4":1,"impulsivity_score":3.0},
      "overall_impression": {"overall_1":5,"overall_2":5,"overall_3":4,"relational_burden":4.7,"perceived_patterns":["Idealisierung und Abwertung","Manipulatives Verhalten","Mangel an Empathie","Grandiosität / Überlegenheitsgefühl"],"free_text":"Nach außen wirkt er charmant und beeindruckend. Im Privaten habe ich mich zunehmend klein, schuldig und an meiner eigenen Wahrnehmung zweifelnd erlebt."}
    }'::jsonb,
    ARRAY['emotional_reactions','empathy','self_image','manipulation','attachment_patterns','impulsivity','overall_impression']
)
ON CONFLICT (case_id) DO UPDATE
   SET modules = EXCLUDED.modules,
       completed_modules = EXCLUDED.completed_modules,
       updated_at = NOW();

-- 2b. Personenprofil in Marcos Fall: seine Einschätzung von Lena (moderat) ----
INSERT INTO person_profiles (case_id, user_id, modules, completed_modules)
VALUES (
    'dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002',
    '{
      "emotional_reactions": {"emot_1":3,"emot_2":3,"emot_3":2,"emot_4":3,"emot_5":2,"emotional_volatility":2.6},
      "empathy": {"emp_1":3,"emp_2":2,"emp_3":3,"emp_4":2,"emp_5":3,"empathy_deficit":2.6},
      "self_image": {"self_1":2,"self_2":2,"self_3":3,"self_4":2,"self_5":2,"grandiosity":2.3},
      "manipulation": {"manip_1":4,"manip_2":3,"manip_3":2,"manip_4":2,"manip_5":3,"manipulation_score":2.8},
      "attachment_patterns": {"attach_1":2,"attach_2":3,"attach_3":2,"attach_4":4,"attach_5":4,"attachment_instability":3.0},
      "impulsivity": {"imp_1":2,"imp_2":3,"imp_3":3,"imp_4":1,"impulsivity_score":2.3},
      "overall_impression": {"overall_1":4,"overall_2":4,"overall_3":3,"relational_burden":3.7,"perceived_patterns":["Starke Stimmungswechsel","Mangel an Empathie","Manipulatives Verhalten"],"free_text":"Ich habe mich oft kritisiert und missverstanden gefühlt. Wenn ich mich zurückzog, wurde das als Bestrafung gedeutet. Ich frage mich zunehmend, welchen Anteil ich selbst an der Eskalation habe."}
    }'::jsonb,
    ARRAY['emotional_reactions','empathy','self_image','manipulation','attachment_patterns','impulsivity','overall_impression']
)
ON CONFLICT (case_id) DO UPDATE
   SET modules = EXCLUDED.modules,
       completed_modules = EXCLUDED.completed_modules,
       updated_at = NOW();

-- 3. Zwei tastende Arbeitshypothesen für Marco --------------------------------
INSERT INTO case_hypotheses (case_id, user_id, hypothesis_type, summary_text)
VALUES
('dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002', 'hyp_attachment',
 'Bei Marco Hinweise auf einen ängstlich-ambivalenten Bindungsstil mit ausgeprägter Verlustangst: Andeutungen der Partnerin zu gehen und ihre Rückzüge lösen Panik und Klammern aus (Bitten, „alles tun, damit sie bleibt"). Sein eigener Rückzug bei Überforderung wirkt widersprüchlich (Deaktivierung), verstärkt aber den Nähe-Distanz-Sog. Tastend, keine Diagnose.'),
('dec01000-0000-4000-a000-0000000000cb', 'dec01000-0000-4000-a000-000000000002', 'hyp_own_role',
 'Marcos Eigenanteil liegt in schwer zugänglicher Selbstreflexion: grenzverletzende Handlungen (heimlicher Blick aufs Handy, Kontroll- und Nachfrage-Impulse ums gemeinsame Konto) deutet er als „Sorge" und „Planung", seinen Rückzug als reinen Selbstschutz statt als Wirkung auf die Partnerin. Als verständliche Schutzstrategie zu würdigen — mit dem Ziel, Eigenanteil ohne Selbstverurteilung anzuerkennen.')
ON CONFLICT (case_id, hypothesis_type) DO NOTHING;

-- 4. Freigabe-Scopes für bestehende Demo-Freigaben nachtragen ------------------
-- Lena-Demo: person_profile freigeben.
INSERT INTO case_share_elements (share_id, element_type)
SELECT id, 'person_profile' FROM case_shares
 WHERE case_id = 'dec01000-0000-4000-a000-0000000000ca' AND is_demo = true
ON CONFLICT DO NOTHING;
-- Marco-Demo: person_profile UND hypotheses freigeben.
INSERT INTO case_share_elements (share_id, element_type)
SELECT s.id, e.element_type
  FROM case_shares s
 CROSS JOIN (VALUES ('person_profile'), ('hypotheses')) AS e(element_type)
 WHERE s.case_id = 'dec01000-0000-4000-a000-0000000000cb' AND s.is_demo = true
ON CONFLICT DO NOTHING;

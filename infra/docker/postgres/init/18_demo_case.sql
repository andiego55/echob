-- ── Beispielfall / Spielwiese für Fachpersonen ───────────────────────────────
-- Ein fiktiver, klar gekennzeichneter Beispielfall, der jedem Profi-Account
-- automatisch als „Spielwiese" angezeigt wird (Phase 1 der Vertriebsstrecke).
-- Inhalt: erfunden, respektvoll, zur Demonstration der Werkzeuge (Echo, Berichte,
-- Hypothesen, Sitzungsnotizen). KEINE echten Personendaten.
--
-- Klient-seitige Inhalte werden hier in KLARTEXT geseedet — crypto.decrypt reicht
-- Werte ohne "enc:v1:"-Präfix unverändert durch, daher in der Profi-Ansicht korrekt.
-- Die pro-Fachperson-Artefakte (Notizen/Bericht/Zuweisungen) legt demo_service.py an.
--
-- Idempotent (ON CONFLICT DO NOTHING). Manuell einspielen:
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/18_demo_case.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/18_demo_case.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Markierung für Demo-Freigaben (von der späteren Abrechnung ausgenommen).
ALTER TABLE case_shares ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- ── Demo-Klientin (fiktiv; kein Auth-User nötig) ─────────────────────────────
INSERT INTO user_profiles (user_id, display_name)
VALUES ('dec01000-0000-4000-a000-000000000001', 'Beispiel: Lena M.')
ON CONFLICT (user_id) DO NOTHING;

-- ── Fall ─────────────────────────────────────────────────────────────────────
INSERT INTO cases (id, user_id, relationship_type, relationship_status, contact_frequency, main_concern)
VALUES (
    'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
    'ex_partner', 'separated', 'occasionally',
    'Nach der Trennung das wiederkehrende Muster verstehen und wieder Boden unter die Füße bekommen.'
)
ON CONFLICT (id) DO NOTHING;

-- ── Onboarding ───────────────────────────────────────────────────────────────
INSERT INTO onboarding_answers (
    case_id, user_id, relationship_description, typical_scenes, main_burden,
    significant_event, memorable_scenes, distress_score, safety_status, pattern_hypotheses
)
VALUES (
    'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
    'Knapp drei Jahre Beziehung mit Marco. Anfangs überwältigend intensiv und liebevoll, später zunehmend abwertend und kontrollierend. Seit vier Monaten getrennt, aber über gemeinsame Bekannte und offene Themen weiter in Kontakt.',
    'Auf eine eigene Meinung folgt Abwertung oder Liebesentzug; nach Streit drehe am Ende ich mich im Kreis und entschuldige mich.',
    'Ich zweifle an meiner eigenen Wahrnehmung und habe Kontakte zu Freundinnen verloren.',
    'Als ich nach einem abgesagten Geburtstag Grenzen setzte, folgten zwei Wochen eisiges Schweigen, danach große Gesten, als wäre nichts gewesen.',
    'Idealling am Anfang, Schuldumkehr nach Konflikten, das wiederkehrende „du bist zu empfindlich".',
    5, 'elevated',
    '[{"label":"Schuldumkehr nach Konflikten","confidence":"high","source":"onboarding"},{"label":"Nähe-Distanz-Zyklus","confidence":"medium","source":"onboarding"},{"label":"Erosion des Selbstvertrauens","confidence":"high","source":"onboarding"}]'::jsonb
)
ON CONFLICT (case_id) DO NOTHING;

-- ── Szenen (~20, chronologisch über die Beziehung) ───────────────────────────
INSERT INTO scenes (id, case_id, user_id, title, scene_date, description, user_reaction, distress_score, pattern_tags, confirmed_by_user, input_mode)
VALUES
('dec0a000-0000-4000-a000-000000000001'::uuid, 'dec01000-0000-4000-a000-0000000000ca'::uuid, 'dec01000-0000-4000-a000-000000000001'::uuid,
 'Der überwältigende Anfang', '2022-09-12'::date,
 'Schon nach zwei Wochen sprach Marco von „Seelenverwandtschaft", schrieb stündlich und plante gemeinsame Jahre. Es fühlte sich aufregend und ein bisschen schwindelig an.',
 'Geschmeichelt, verliebt, aber auch leicht überrumpelt.', 2, '["Idealisierung"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000002', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Die erste Abwertung', '2022-11-03',
 'Bei einem Abendessen mit meinen Kolleg:innen korrigierte er mehrfach, wie ich Geschichten erzähle, und nannte mich danach im Auto „peinlich naiv".',
 'Beschämt, verunsichert; ich entschuldigte mich für etwas, das ich nicht benennen konnte.', 3, '["Abwertung"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000003', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Wer hat das gesagt?', '2022-12-19',
 'Er bestritt, mir einen wichtigen Termin zugesagt zu haben, und sagte, ich würde mir Dinge ausdenken. Später fand ich seine Nachricht, die es belegte.',
 'Erleichtert über den Beweis und gleichzeitig erschüttert, wie sehr ich schon an mir zweifelte.', 4, '["Gaslighting","Wahrnehmungsverzerrung"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000004', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Die Freundinnen stören', '2023-01-22',
 'Nach jedem Treffen mit meiner besten Freundin war Marco gekränkt und still. „Die zieht dich nur runter." Ich begann, Treffen vorsichtshalber nicht mehr zu erwähnen.',
 'Schlechtes Gewissen, als täte ich etwas Verbotenes.', 3, '["Isolation","Kontrolle"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000005', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Geld als Hebel', '2023-02-14',
 'Wir legten ein gemeinsames Konto an, „der Einfachheit halber". Größere Ausgaben musste ich plötzlich begründen, seine nicht.',
 'Klein und abhängig, obwohl ich gut verdiene.', 3, '["Kontrolle"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000006', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Der abgesagte Geburtstag', '2023-03-30',
 'Er sagte meine Geburtstagsfeier kurzfristig ab, weil er „keine Lust auf deine Leute" hatte. Als ich enttäuscht war, warf er mir vor, undankbar zu sein.',
 'Wut, dann sofort Zweifel, ob ich überreagiere.', 4, '["Schuldumkehr","Grenzüberschreitung"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000007', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Zwei Wochen Schweigen', '2023-04-02',
 'Nach diesem Streit sprach er zwei Wochen kaum ein Wort mit mir, reagierte auf nichts. Die Stille war lauter als jeder Streit.',
 'Verzweifelt; ich hätte fast alles getan, damit es aufhört.', 5, '["Liebesentzug"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000008', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Die große Geste', '2023-04-17',
 'Plötzlich Blumen, ein Wochenende am Meer, Tränen und Versprechen. Als hätte es die zwei Wochen nie gegeben. Über das Eigentliche sprachen wir nie.',
 'Hin- und hergerissen zwischen Erleichterung und einem leisen „schon wieder".', 3, '["Idealisierung","Nähe-Distanz"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000009', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Du bist zu empfindlich', '2023-06-08',
 'Als mich ein Spruch über mein Gewicht verletzte, lachte er: „Das war ein Witz, du bist einfach zu empfindlich." Diesen Satz hörte ich von da an ständig.',
 'Klein gemacht; ich fing an, meine Gefühle für falsch zu halten.', 4, '["Abwertung","Wahrnehmungsverzerrung"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-00000000000a', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Kontrolle des Handys', '2023-07-21',
 'Er las heimlich meine Nachrichten und stellte mich wegen einer harmlosen Konversation zur Rede. Mein Protest drehte sich in „Was hast du zu verbergen?".',
 'Überwacht und gleichzeitig in die Defensive gedrängt.', 4, '["Kontrolle","Schuldumkehr"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-00000000000b', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Vor anderen klein gemacht', '2023-09-02',
 'Auf einer Feier machte er mich vor Freunden zur Pointe seiner Witze. Als ich es später ansprach, sagte er, alle hätten doch gelacht.',
 'Gedemütigt, allein mit meinem Empfinden.', 4, '["Abwertung"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-00000000000c', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Das Therapie-Thema', '2023-10-15',
 'Als ich vorsichtig von Paarberatung sprach, lehnte er empört ab: „Mit dir und deinen Problemen müsste man da hin, nicht mit mir."',
 'Mutlos; sogar Hilfe holen wurde zu meinem Fehler.', 3, '["Schuldumkehr"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-00000000000d', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Der Riss', '2023-12-24',
 'Heiligabend eskalierte ein Nichts. Er ließ mich vor der verschlossenen Wohnungstür stehen und ging zu Freunden. Da begriff ich etwas.',
 'Erschöpft, seltsam klar, zum ersten Mal eher traurig als schuldig.', 4, '["Liebesentzug","Grenzüberschreitung"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-00000000000e', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Erstes Aussprechen', '2024-01-09',
 'Ich erzählte meiner Schwester zum ersten Mal ehrlich, wie es mir geht. Sie weinte. Mir wurde klar, wie viel ich verschwiegen hatte.',
 'Scham, aber auch ein erster Funke Entlastung.', 2, '["Isolation"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-00000000000f', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Die Trennung', '2024-02-18',
 'Ich beendete die Beziehung. Er wechselte innerhalb einer Stunde zwischen Flehen, Vorwürfen und Kälte. „Ohne mich schaffst du das nicht."',
 'Zitternd, entschlossen, voller Angst und Erleichterung zugleich.', 4, '["Kontrolle","Abwertung"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000010', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Hoovering', '2024-03-11',
 'Drei Wochen später kamen lange Nachrichten: Er habe sich verändert, ich sei seine einzige Wahre. Am nächsten Tag ein kühler Vorwurf wegen Geld.',
 'Verwirrt, fast wäre ich zurückgerutscht.', 3, '["Idealisierung","Nähe-Distanz"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000011', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Erzählung nach außen', '2024-04-05',
 'Über Bekannte hörte ich, er erzähle überall, ich hätte ihn betrogen und im Stich gelassen. Manche zogen sich von mir zurück.',
 'Ohnmächtig gegen ein Bild, das ich nicht geraderücken kann.', 4, '["Wahrnehmungsverzerrung","Isolation"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000012', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Streit ums Konto', '2024-05-02',
 'Bei der Auflösung des gemeinsamen Kontos verzögerte er alles und machte jede Mail zu einem Vorwurf. Sachliches blieb unmöglich.',
 'Angespannt; jeder Kontakt zieht mich kurz zurück ins alte Muster.', 3, '["Kontrolle","Konflikteskalation"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000013', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Ein guter Tag', '2024-05-26',
 'Zum ersten Mal seit langem ein Wochenende ohne Grübeln. Ich traf zwei alte Freundinnen und lachte, ohne danach Angst zu haben.',
 'Vorsichtig hoffnungsvoll; so kann es sich also auch anfühlen.', 1, '["Ressource"]'::jsonb, true, 'guided'),
('dec0a000-0000-4000-a000-000000000014', 'dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001',
 'Rückfall in den Sog', '2024-06-14',
 'Eine einzige unterkühlte Nachricht von ihm warf mich für zwei Tage zurück: Grübeln, Selbstzweifel, das alte „vielleicht war ich das Problem".',
 'Frustriert über mich selbst, dass es noch so viel Macht hat.', 3, '["Schuldumkehr","Wahrnehmungsverzerrung"]'::jsonb, true, 'guided')
ON CONFLICT (id) DO NOTHING;

-- ── Skalenwerte (aus den Szenen abgeleitet) ──────────────────────────────────
INSERT INTO scale_scores (case_id, user_id, scale_key, score, scene_count, confidence, notes)
VALUES
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'guilt_shifting',        4.6, 8, 'high',   'Konflikte enden regelhaft mit Lenas Entschuldigung.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'perception_distortion', 4.4, 6, 'high',   'Wiederholtes Infragestellen ihrer Wahrnehmung und Erinnerung.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'boundary_violation',    4.3, 7, 'high',   'Grenzen werden übergangen, Neins umgedeutet.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'control_isolation',     4.0, 6, 'medium', 'Kontostruktur, Handy, Rückzug von Freundinnen.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'proximity_distance',    3.8, 5, 'medium', 'Idealisierung und Liebesentzug im Wechsel.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'conflict_escalation',   3.4, 4, 'medium', 'Eskalation aus Nichtigkeiten, dann eisige Stille.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'safety_risk',           2.6, 3, 'low',    'Keine körperliche Gewalt geschildert; psychische Belastung hoch.')
ON CONFLICT (case_id, scale_key) DO NOTHING;

-- ── Themen-Zusammenfassungen ─────────────────────────────────────────────────
INSERT INTO topic_summaries (case_id, user_id, topic, summary_text)
VALUES
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'topic_self',
 'Lena beschreibt sich als empathisch, leistungsfähig und lange sehr nachgiebig. Im Verlauf hat sie gelernt, ihre Gefühle zu misstrauen. Erste Ressourcen kehren zurück: Kontakt zur Schwester, Momente ohne Grübeln.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'topic_person',
 'Marco wird als anfangs idealisierend, später abwertend und kontrollierend geschildert. Auffällig sind Schuldumkehr, Liebesentzug als Steuerung und das Umdeuten ihrer Wahrnehmung.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'topic_responsibility',
 'Lena ringt damit, ihren Anteil realistisch einzuordnen, ohne in Selbstbeschuldigung zu kippen. Thema: Verantwortung für eigene Grenzen, nicht für Marcos Verhalten.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'topic_guilt',
 'Schuldgefühle treten v. a. nach Kontakt auf und wirken eher anerzogen/durch Druck erzeugt als durch tatsächliches Fehlverhalten begründet.')
ON CONFLICT (case_id, topic) DO NOTHING;

-- ── Arbeitshypothesen (tastend, keine Diagnose) ──────────────────────────────
INSERT INTO case_hypotheses (case_id, user_id, hypothesis_type, summary_text)
VALUES
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'hyp_dynamics',
 'Wiederkehrender Zyklus aus Idealisierung → Abwertung → Liebesentzug → großer Geste. Konflikte enden mit Schuldumkehr; Lenas Grenzsetzung wird mit Rückzug bestraft.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'hyp_clusterb',
 'Mehrere narzisstisch anmutende Merkmale im Fremdbericht (Grandiosität, geringe Empathie, Kränkbarkeit, Entwertung). Tastende Arbeitshypothese, ausdrücklich keine Diagnose — einseitige Quelle.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'hyp_attachment',
 'Bei Lena Hinweise auf einen ängstlichen Bindungsstil, der den Sog der Nähe-Distanz-Dynamik verstärkt; hohe Verlustangst in den Schweigephasen.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'hyp_trauma',
 'Anzeichen einer kumulativen emotionalen Traumatisierung (Hypervigilanz, Selbstzweifel, Erschöpfung). Stabilisierung und Psychoedukation stehen vor Konfrontation.'),
('dec01000-0000-4000-a000-0000000000ca', 'dec01000-0000-4000-a000-000000000001', 'hyp_own_role',
 'Lenas Anteil liegt in früh übergangenen eigenen Grenzen und großer Anpassungsbereitschaft — als verständliche Schutzstrategie zu würdigen, nicht als Schuld.')
ON CONFLICT (case_id, hypothesis_type) DO NOTHING;

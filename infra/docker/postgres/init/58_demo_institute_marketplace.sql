-- ── Demo-Anbieter-Institut + 3 Beispielfälle + 3 Marktplatz-Module ───────────
-- Befüllt den Modul-Marktplatz mit echtem Inhalt: ein synthetisches Anbieter-
-- Institut („EchoB Lehrbeispiele") stellt drei sorgfältig geschriebene, fiktive
-- Beispielfälle bereit, jeweils als kostenloses, verkaufbares Lernmodul (Fall +
-- Lektion + Wissenscheck). Jedes echte Institut sieht die Module im Marktplatz und
-- kann sie per „Kostenlos übernehmen" in die eigene Fallbibliothek klonen.
--
-- Inhalte: erfunden, respektvoll, NICHT diagnostisch (tastende Arbeitshypothesen).
-- KEINE echten Personendaten. Klient-seitige Felder in KLARTEXT (crypto.decrypt reicht
-- Werte ohne „enc:v1:"-Präfix unverändert durch — in Profi-/Studierenden-Ansicht korrekt).
--
-- Setzt Migrationen 50/51/53/55/56 voraus (learning_modules + steps.payload +
-- institute_examples.master_solution/difficulty/tags + learning_modules.price_cents/teaser).
-- Reines Daten-Seed, kein API-Rebuild nötig. Idempotent (feste UUIDs + ON CONFLICT DO NOTHING).
--
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/58_demo_institute_marketplace.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Anbieter-Institut (synthetisch; user_id ist KEIN FK auf auth.users) ───────
INSERT INTO training_institutes (id, user_id, name, contact_name, email, student_quota, example_quota, plan)
VALUES ('de401000-0000-4000-a000-000000000100', 'de401000-0000-4000-a000-000000000101',
        'EchoB Lehrbeispiele', 'Redaktion EchoB', 'kontakt@echo-b.de', 0, 50, 'ausbildung')
ON CONFLICT (id) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- FALL 1 — Verdeckter Narzissmus & Co-Abhängigkeit  (Schwierigkeit: schwer)
-- Klientin Katharina lebt mit Sebastian, dessen Muster leise sind: Opferrolle,
-- gekränkter Rückzug, unsichtbares „Ich opfere mich". Sie überfunktioniert und
-- verliert sich. Gerade weil es keine lauten Streits gibt, ist es schwer zu fassen.
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO user_profiles (user_id, display_name)
VALUES ('de401000-0000-4000-a000-000000000011', 'Beispiel: Katharina')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO cases (id, user_id, relationship_type, relationship_status, contact_frequency, main_concern)
VALUES ('de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011',
        'partner', 'together', 'daily',
        'Verstehen, warum ich in einer Beziehung ohne laute Streits so erschöpft bin und ständig an mir zweifle.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO onboarding_answers (
    case_id, user_id, person_name, relationship_description, typical_scenes, main_burden,
    significant_event, memorable_scenes, distress_score, safety_status, pattern_hypotheses, completed_at)
VALUES (
    'de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011', 'Sebastian',
    'Sechs Jahre zusammen, seit drei Jahren in gemeinsamer Wohnung. Sebastian wirkt nach außen sanft und feinfühlig. Von Anfang an hatte ich das Gefühl, ihn beschützen und tragen zu müssen — und dass das Liebe sei.',
    'Ich äußere einen Wunsch, und statt einer Antwort kommt ein verletzter Blick oder Rückzug. Am Ende tröste ich ihn und entschuldige mich für meinen Wunsch.',
    'Ich funktioniere nur noch. Ich spüre kaum, was ich selbst brauche, und halte mich für undankbar, wenn ich müde bin.',
    'Als ich einmal ein Wochenende allein mit Freundinnen wollte, sagte er nichts Böses — er wurde nur still, seufzte, „macht ihr nur". Danach hatte ich zwei Wochen ein schlechtes Gewissen.',
    'Der ewig gekränkte Rückzug, das leise „schon gut, lass nur", und dass ich nie das Lob bekomme, für das ich mich so anstrenge.',
    4, 'elevated',
    '[{"label":"Verdeckte Abwertung / Opferrolle","confidence":"high","source":"onboarding"},{"label":"Co-Abhängigkeit / Selbstaufgabe","confidence":"high","source":"onboarding"},{"label":"Liebesentzug als Steuerung","confidence":"medium","source":"onboarding"}]'::jsonb,
    NOW())
ON CONFLICT (case_id) DO NOTHING;

INSERT INTO scenes (id, case_id, user_id, title, scene_date, description, user_reaction, distress_score, pattern_tags, confirmed_by_user, input_mode)
VALUES
('de401000-0000-4000-a000-00000a100001', 'de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011',
 'Der sanfte Anfang', '2019-05-04',
 'Sebastian erzählte früh von einer schweren Kindheit und davon, dass ihn nie jemand wirklich verstanden habe. Ich fühlte mich ausgewählt, endlich diejenige zu sein, die ihn hält.',
 'Gebraucht, wichtig, ein bisschen stolz auf meine Rolle.', 2, '["Idealisierung","Fürsorge-Falle"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a100002', 'de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011',
 'Das unsichtbare Opfer', '2020-02-11',
 'Ich hatte tagelang seine Bewerbung mit ihm überarbeitet. Als sie klappte, sagte er beim Essen mit Freunden, er habe sich „ganz allein durchgebissen". Mich erwähnte er nicht.',
 'Ein Stich, den ich sofort kleinredete: Sei nicht kleinlich.', 3, '["Entwertung","Verdeckter Narzissmus"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a100003', 'de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011',
 'Der gekränkte Rückzug', '2020-07-19',
 'Ich sagte vorsichtig, dass ich mir mehr gemeinsame Planung wünsche. Er antwortete nicht, zog sich ins Schlafzimmer zurück und war zwei Tage einsilbig. Am dritten Tag entschuldigte ich mich.',
 'Panisch, es wiedergutzumachen; erleichtert, als er endlich wieder lächelte.', 4, '["Liebesentzug","Schuldumkehr"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a100004', 'de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011',
 'Nie gesagt, immer gespürt', '2021-01-08',
 'Es gibt keine Vorwürfe. Nur Seufzer, enttäuschte Blicke, ein „ist schon okay" in einem Ton, der das Gegenteil meint. Ich verbringe halbe Tage damit, seine Stimmung zu lesen.',
 'Ständig wachsam, als liefe im Hintergrund ein Alarm.', 3, '["Passiv-Aggressiv","Emotionale Nichtverfügbarkeit"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a100005', 'de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011',
 'Seine Idee', '2021-06-22',
 'Ich organisierte seinen runden Geburtstag komplett — Gäste, Location, Essen. Am Abend erzählte er allen, wie viel Arbeit „er" sich gemacht habe. Ich lächelte und schwieg.',
 'Unsichtbar. Und wütend auf mich, dass mich das noch trifft.', 3, '["Entwertung","Selbstaufgabe"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a100006', 'de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011',
 'Die feine Distanz zu den Freundinnen', '2021-11-30',
 'Er verbietet mir nichts. Aber nach jedem Treffen mit meiner besten Freundin ist er verletzt und kühl, sagt, er habe sich „so allein gefühlt". Ich sage Treffen inzwischen lieber ab.',
 'Schuldig, als würde ich ihm etwas wegnehmen.', 4, '["Isolation","Liebesentzug"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a100007', 'de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011',
 'Krank sein dürfen nur die anderen', '2022-03-14',
 'Ich lag mit Fieber im Bett. Statt zu fragen, wie es mir geht, zählte er auf, wie anstrengend sein Tag gewesen sei. Am Ende kochte ich uns beiden Tee.',
 'Erschöpft bis auf die Knochen, aber pflichtbewusst.', 4, '["Emotionale Nichtverfügbarkeit","Selbstaufgabe"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a100008', 'de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011',
 'Der Therapie-Vorschlag', '2022-09-02',
 'Ich schlug behutsam eine Paarberatung vor. Er war tief getroffen: „Dass du uns für so kaputt hältst, tut mir wirklich weh." Am Ende beruhigte ich ihn — das Thema war vom Tisch.',
 'Mutlos; sogar der Wunsch nach Hilfe wurde zu meinem Vergehen.', 3, '["Schuldumkehr","Opferrolle"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a100009', 'de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011',
 'Das Lob, das nie kommt', '2023-01-27',
 'Mir fiel auf, dass ich seit Jahren auf einen Satz warte: dass er sieht, was ich alles trage. Er kommt nicht. Ich strenge mich nur noch mehr an, als könnte ich ihn verdienen.',
 'Leer, mit einer leisen, erschreckenden Klarheit.', 4, '["Selbstwert","Co-Abhängigkeit"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a10000a', 'de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011',
 'Der Satz meiner Schwester', '2023-05-16',
 'Meine Schwester hörte mir lange zu und sagte dann leise: „Du redest von ihm wie von einem Kind, für das du sorgst — nicht wie von einem Partner." Ich musste weinen, weil es stimmte.',
 'Erschüttert und zum ersten Mal ein Stück verstanden.', 3, '["Ressource","Klarheit"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a10000b', 'de401000-0000-4000-a000-0000000000c1', 'de401000-0000-4000-a000-000000000011',
 'Ein Nachmittag für mich', '2023-08-05',
 'Er war übers Wochenende bei seinem Bruder. Ich saß auf dem Balkon, ohne auf eine Stimmung zu lauschen. Mir wurde bewusst, wie selten ich einfach nur atme.',
 'Vorsichtige Erleichterung — und Trauer darüber, wie neu sich das anfühlt.', 2, '["Ressource","Selbstfürsorge"]'::jsonb, true, 'guided')
ON CONFLICT (id) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- FALL 2 — Idealisierung, Entwertung, Hoovering & ängstliche Bindung  (mittel)
-- Klientin Marlene, Partner Deniz: überwältigender Beginn (Love-Bombing), dann
-- Abwertung und Gaslighting, große Versöhnungen ohne echte Klärung. Klare, gut
-- lesbare Muster — geeignet als didaktischer Grundfall.
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO user_profiles (user_id, display_name)
VALUES ('de401000-0000-4000-a000-000000000012', 'Beispiel: Marlene')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO cases (id, user_id, relationship_type, relationship_status, contact_frequency, main_concern)
VALUES ('de401000-0000-4000-a000-0000000000c2', 'de401000-0000-4000-a000-000000000012',
        'partner', 'conflict_laden', 'daily',
        'Verstehen, warum die Beziehung zwischen traumhaft und vernichtend hin- und herspringt — und warum ich trotzdem nicht loskomme.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO onboarding_answers (
    case_id, user_id, person_name, relationship_description, typical_scenes, main_burden,
    significant_event, memorable_scenes, distress_score, safety_status, pattern_hypotheses, completed_at)
VALUES (
    'de401000-0000-4000-a000-0000000000c2', 'de401000-0000-4000-a000-000000000012', 'Deniz',
    'Gut zwei Jahre zusammen. Der Anfang war ein Rausch — Deniz war charmant, großzügig, sagte nach zwei Wochen, ich sei die Frau seines Lebens. Heute weiß ich nie, welche Version von ihm nach Hause kommt.',
    'Erst ziehe ich ihn an wie ein Magnet, dann ist plötzlich alles an mir falsch. Nach dem Streit kommt eine riesige Geste, und ich soll so tun, als sei nichts gewesen.',
    'Ich vertraue meiner eigenen Wahrnehmung nicht mehr. Ich prüfe ständig, ob ich überreagiere.',
    'Bei einem Abendessen machte er mich vor Freunden zur Pointe, und als ich es ansprach, sagte er, das habe ich mir eingebildet — alle hätten doch nur gelacht.',
    'Das Wechselbad: himmelhoch geliebt, Tage später kalt entwertet. Und die Angst, ihn zu verlieren, sobald er sich entzieht.',
    4, 'elevated',
    '[{"label":"Idealisierung-Entwertung-Zyklus","confidence":"high","source":"onboarding"},{"label":"Gaslighting / Wahrnehmungsverzerrung","confidence":"high","source":"onboarding"},{"label":"Ängstliche Bindung / Verlustangst","confidence":"medium","source":"onboarding"}]'::jsonb,
    NOW())
ON CONFLICT (case_id) DO NOTHING;

INSERT INTO scenes (id, case_id, user_id, title, scene_date, description, user_reaction, distress_score, pattern_tags, confirmed_by_user, input_mode)
VALUES
('de401000-0000-4000-a000-00000a200001', 'de401000-0000-4000-a000-0000000000c2', 'de401000-0000-4000-a000-000000000012',
 'Der Rausch', '2022-03-09',
 'Innerhalb weniger Tage überschüttete Deniz mich mit Nachrichten, Blumen und Plänen für unsere gemeinsame Zukunft. Er sagte, so etwas habe er noch nie gefühlt. Es war schwindelerregend schön.',
 'Verliebt, auserwählt, ein bisschen überrumpelt.', 1, '["Love-Bombing","Idealisierung"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a200002', 'de401000-0000-4000-a000-0000000000c2', 'de401000-0000-4000-a000-000000000012',
 'Die erste feine Abwertung', '2022-05-21',
 'Nach Wochen der Schwärmerei kam der erste Seitenhieb: Meine Art zu reden sei manchmal „ein bisschen einfach". Er sagte es lächelnd, wie ein Kompliment verpackt.',
 'Verunsichert, ohne genau zu wissen, warum.', 2, '["Entwertung"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a200003', 'de401000-0000-4000-a000-0000000000c2', 'de401000-0000-4000-a000-000000000012',
 'Habe ich das geträumt?', '2022-07-30',
 'Er hatte mir fest zugesagt, mich vom Bahnhof abzuholen, und ließ mich dann warten. Später bestritt er, es je versprochen zu haben, und meinte, ich verdrehe Dinge. Ich fand die Nachricht — es stand schwarz auf weiß da.',
 'Erleichtert über den Beweis, erschüttert, wie sehr ich schon zweifelte.', 4, '["Gaslighting","Wahrnehmungsverzerrung"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a200004', 'de401000-0000-4000-a000-0000000000c2', 'de401000-0000-4000-a000-000000000012',
 'Charme nach außen, Kälte nach innen', '2022-09-17',
 'Auf einer Feier war er der herzlichste Mensch im Raum. Kaum saßen wir im Auto, fiel die Wärme ab wie eine Maske, und er schwieg mich den ganzen Heimweg an.',
 'Irritiert und einsam neben dem Menschen, den alle beneiden.', 3, '["Fassade","Emotionale Nichtverfügbarkeit"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a200005', 'de401000-0000-4000-a000-0000000000c2', 'de401000-0000-4000-a000-000000000012',
 'Eifersucht als Liebe verkleidet', '2022-11-25',
 'Er wollte wissen, mit wem ich schreibe, und meinte, das sei doch nur, weil er mich so liebe. Nach und nach meldete ich Treffen vorsichtshalber vorher an.',
 'Eingeengt, aber halb überzeugt, das sei Fürsorge.', 3, '["Kontrolle","Eifersucht"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a200006', 'de401000-0000-4000-a000-0000000000c2', 'de401000-0000-4000-a000-000000000012',
 'Vor anderen klein gemacht', '2023-01-13',
 'Beim Abendessen mit Freunden machte er meine Arbeit zur Lachnummer. Als ich später ruhig sagte, dass mich das verletzt hat, verdrehte er die Augen: „Jetzt bist du wieder überempfindlich."',
 'Gedemütigt und allein mit meinem Empfinden.', 4, '["Entwertung","Gaslighting"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a200007', 'de401000-0000-4000-a000-0000000000c2', 'de401000-0000-4000-a000-000000000012',
 'Die große Versöhnung', '2023-02-04',
 'Nach einer eisigen Woche standen plötzlich Rosen in der Küche, ein gebuchtes Wochenende, Tränen und Versprechen. Über das, was verletzt hatte, sprachen wir mit keinem Wort.',
 'Hin- und hergerissen zwischen Erleichterung und einem leisen „schon wieder".', 3, '["Hoovering","Idealisierung"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a200008', 'de401000-0000-4000-a000-0000000000c2', 'de401000-0000-4000-a000-000000000012',
 'Der Vergleich', '2023-04-29',
 'Im Streit sagte er, andere Frauen wären längst dankbarer für einen Mann wie ihn. Der Satz saß tagelang in mir fest.',
 'Wertlos und austauschbar.', 4, '["Entwertung","Drohung mit Verlust"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a200009', 'de401000-0000-4000-a000-0000000000c2', 'de401000-0000-4000-a000-000000000012',
 'Ich traue mir nicht mehr', '2023-07-08',
 'Ich ertappte mich dabei, wie ich Gespräche heimlich mitschrieb, um später zu wissen, was wirklich gesagt wurde. Ich vertraue meiner Erinnerung nicht mehr.',
 'Zermürbt, wie in einem Nebel.', 5, '["Wahrnehmungsverzerrung","Selbstzweifel"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a20000a', 'de401000-0000-4000-a000-0000000000c2', 'de401000-0000-4000-a000-000000000012',
 'Was die Freundin sah', '2023-09-19',
 'Ich erzählte einer alten Freundin zum ersten Mal ehrlich vom Wechselbad. Sie fragte nur: „Und wann geht es eigentlich dir gut?" Ich hatte keine Antwort.',
 'Wund, aber zum ersten Mal seit langem nicht allein.', 2, '["Ressource","Klarheit"]'::jsonb, true, 'guided')
ON CONFLICT (id) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- FALL 3 — Silent Treatment & Nähe-Distanz (Pursuer-Distancer)  (mittel)
-- Klient Tobias sucht Nähe; Partnerin Nadine zieht sich zurück, bestraft mit
-- Schweigen, bleibt emotional unerreichbar. Eine leisere, deprivierende Dynamik —
-- gut, um Silent Treatment und Verfolger-Rückzug-Muster ohne Dämonisierung zu üben.
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO user_profiles (user_id, display_name)
VALUES ('de401000-0000-4000-a000-000000000013', 'Beispiel: Tobias')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO cases (id, user_id, relationship_type, relationship_status, contact_frequency, main_concern)
VALUES ('de401000-0000-4000-a000-0000000000c3', 'de401000-0000-4000-a000-000000000013',
        'partner', 'together', 'daily',
        'Verstehen, warum ich mich in meiner eigenen Beziehung chronisch allein und ständig „zu bedürftig" fühle.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO onboarding_answers (
    case_id, user_id, person_name, relationship_description, typical_scenes, main_burden,
    significant_event, memorable_scenes, distress_score, safety_status, pattern_hypotheses, completed_at)
VALUES (
    'de401000-0000-4000-a000-0000000000c3', 'de401000-0000-4000-a000-000000000013', 'Nadine',
    'Vier Jahre zusammen, wir wohnen zusammen. Nadine ist klug und nach außen zugewandt. Sobald etwas zwischen uns unangenehm wird, macht sie dicht — tagelang Schweigen, freundlich zu allen anderen, kühl zu mir.',
    'Ich spreche etwas an, sie zieht sich zurück und schweigt. Ich halte die Stille nicht aus, entschuldige mich, und irgendwann taut sie auf, als sei nichts gewesen.',
    'Ich komme mir vor wie ein Bittsteller um Zuwendung und frage mich, ob mit mir etwas nicht stimmt.',
    'An unserem Jahrestag tat sie so, als sei es ein Tag wie jeder andere. Als ich enttäuscht war, sagte sie, ich mache aus allem ein Drama.',
    'Das tagelange Schweigen ohne Vorwurf, das „mir geht es gut" in eiskaltem Ton, und wie ich zum Verfolger werde, der um ein Gespräch bettelt.',
    3, 'unclear',
    '[{"label":"Silent Treatment / Rückzug als Steuerung","confidence":"high","source":"onboarding"},{"label":"Verfolger-Rückzug-Dynamik (Pursuer-Distancer)","confidence":"high","source":"onboarding"},{"label":"Selbstaufgabe / Über-Anpassung","confidence":"medium","source":"onboarding"}]'::jsonb,
    NOW())
ON CONFLICT (case_id) DO NOTHING;

INSERT INTO scenes (id, case_id, user_id, title, scene_date, description, user_reaction, distress_score, pattern_tags, confirmed_by_user, input_mode)
VALUES
('de401000-0000-4000-a000-00000a300001', 'de401000-0000-4000-a000-0000000000c3', 'de401000-0000-4000-a000-000000000013',
 'Die Mauer', '2021-10-02',
 'Nach einer kleinen Meinungsverschiedenheit über den Urlaub wurde Nadine still. Nicht laut, nicht wütend — einfach abwesend. Drei Tage lang beantwortete sie nur das Nötigste, ohne zu sagen, was los war.',
 'Ratlos, dann zunehmend panisch, dass ich etwas Schlimmes getan habe.', 3, '["Silent Treatment","Emotionale Nichtverfügbarkeit"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a300002', 'de401000-0000-4000-a000-0000000000c3', 'de401000-0000-4000-a000-000000000013',
 'Mir geht es gut', '2022-01-15',
 'Ich fragte behutsam, ob etwas sei. „Mir geht es gut", sagte sie in einem Ton, der Eiszapfen bilden könnte. Jede weitere Frage machte die Kälte nur größer.',
 'Verunsichert und schuldig, ohne zu wissen, wofür.', 3, '["Passiv-Aggressiv","Verleugnung"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a300003', 'de401000-0000-4000-a000-0000000000c3', 'de401000-0000-4000-a000-000000000013',
 'Immer später, nie jetzt', '2022-04-27',
 'Ich bat um einen Abend, an dem wir mal in Ruhe reden. „Nicht heute, ich bin müde." Das galt seit Monaten für jedes Gespräch, das mir wichtig war.',
 'Aufgeschoben und unwichtig.', 3, '["Emotionale Nichtverfügbarkeit","Bedürfnisaufschub"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a300004', 'de401000-0000-4000-a000-0000000000c3', 'de401000-0000-4000-a000-000000000013',
 'Strafe ohne Worte', '2022-08-06',
 'Nachdem ich einen Abend mit Kollegen verbracht hatte, „vergaß" sie tagelang jede kleine Zuwendung — kein Gruß, keine Berührung. Gesagt wurde nichts, gespürt alles.',
 'Bestraft für etwas, das ich nicht benennen durfte.', 4, '["Silent Treatment","Liebesentzug"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a300005', 'de401000-0000-4000-a000-0000000000c3', 'de401000-0000-4000-a000-000000000013',
 'Der Bittsteller', '2022-12-11',
 'Nach vier Tagen Stille hielt ich es nicht mehr aus und entschuldigte mich — für einen Streit, den ich gar nicht angefangen hatte. Sofort wurde sie wieder freundlich. Das Muster war gelernt.',
 'Erleichtert und im selben Moment beschämt über mich.', 4, '["Schuldumkehr","Selbstaufgabe"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a300006', 'de401000-0000-4000-a000-0000000000c3', 'de401000-0000-4000-a000-000000000013',
 'Warm zu allen, kühl zu mir', '2023-03-03',
 'Auf einer Feier lachte sie mit allen, war zugewandt und offen. Zu Hause fiel wieder der Vorhang. Ich fragte mich, ob nur ich diese kalte Seite kenne.',
 'Einsam neben ihr, mit dem Gefühl, verrückt zu sein.', 3, '["Fassade","Nähe-Distanz"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a300007', 'de401000-0000-4000-a000-0000000000c3', 'de401000-0000-4000-a000-000000000013',
 'Das Gespräch, das nie stattfindet', '2023-06-18',
 'Ich versuchte ein ruhiges „Lass uns über uns reden". Sie stand auf und ging in die Küche: „Es gibt nichts zu reden." Die Tür zwischen uns blieb zu.',
 'Ohnmächtig gegen eine Wand, die nicht antwortet.', 4, '["Stonewalling","Konfliktvermeidung"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a300008', 'de401000-0000-4000-a000-0000000000c3', 'de401000-0000-4000-a000-000000000013',
 'Bin ich zu viel?', '2023-09-24',
 'Ich begann zu glauben, mein Wunsch nach Nähe sei eine Krankheit. Ich machte mich kleiner, fragte weniger, erwartete nichts — und war innerlich am Verhungern.',
 'Resigniert, mit einem Rest Wut, der mir Angst machte.', 4, '["Selbstwert","Deprivation"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a300009', 'de401000-0000-4000-a000-0000000000c3', 'de401000-0000-4000-a000-000000000013',
 'Der Jahrestag', '2023-11-02',
 'An unserem Jahrestag tat Nadine, als sei nichts. Meine Enttäuschung nannte sie „Drama". Ich verbrachte den Abend damit, mich für mein eigenes Bedürfnis zu schämen.',
 'Traurig und seltsam wach — irgendetwas stimmt hier grundlegend nicht.', 3, '["Bedürfnisaufschub","Schuldumkehr"]'::jsonb, true, 'guided'),
('de401000-0000-4000-a000-00000a30000a', 'de401000-0000-4000-a000-0000000000c3', 'de401000-0000-4000-a000-000000000013',
 'Was der Freund spiegelte', '2024-01-20',
 'Ein Freund hörte mir lange zu und sagte dann: „Dir fällt auf, dass du dich immer für Dinge entschuldigst, die du gar nicht getan hast?" Zum ersten Mal sah ich das Muster von außen.',
 'Nachdenklich, mit einem ersten Funken Boden unter den Füßen.', 2, '["Ressource","Klarheit"]'::jsonb, true, 'guided')
ON CONFLICT (id) DO NOTHING;

-- ── Beispielfälle (institute_examples) mit Einordnung + Musterlösung ──────────
INSERT INTO institute_examples (id, institute_id, title, description, status, primary_case_id, difficulty, tags, master_solution)
VALUES
('de401000-0000-4000-a000-0000000000e1', 'de401000-0000-4000-a000-000000000100',
 'Katharina & Sebastian — Verdeckter Narzissmus und Co-Abhängigkeit',
 'Eine leise Dynamik ohne laute Streits: Sebastian in dauerhafter Opferrolle, Katharina überfunktionierend bis zur Selbstaufgabe. Anspruchsvoll, weil die Muster verdeckt sind.',
 'published', 'de401000-0000-4000-a000-0000000000c1', 3,
 ARRAY['Verdeckter Narzissmus','Co-Abhängigkeit','Silent Treatment','Schuldumkehr','Selbstwert'],
 'MUSTERLÖSUNG (Experten-Referenz, nur intern; tastend, ausdrücklich keine Diagnose)

Kernbild: Eine komplementäre Dynamik aus verdeckt-narzisstisch anmutenden Zügen (Sebastian) und co-abhängiger Anpassung (Katharina). Anders als beim grandiosen Typ zeigt sich hier keine offene Abwertung, sondern eine leise Steuerung über Kränkbarkeit, Rückzug und Opferrolle. Genau das macht den Fall didaktisch anspruchsvoll.

Worauf Studierende achten sollten:
- Der Steuerungsmechanismus ist Liebesentzug, nicht Aggression: gekränktes Schweigen (Szene 3, 6), Seufzer und enttäuschte Blicke (Szene 4). Auf Katharinas Wünsche folgt keine Antwort, sondern Rückzug — sie reguliert am Ende SEINE Stimmung.
- Verdeckte Entwertung / Unsichtbarmachung: Er nimmt ihre Leistung für sich in Anspruch (Szene 2, 5). Das ausbleibende Lob (Szene 9) hält sie in einem Verdienst-Modus.
- Co-Abhängigkeit als erlernte Schutzstrategie: Katharinas Überfunktionieren (Szene 1, 7) ist verständlich und zu würdigen — nicht als Schuld zu lesen. Ihr Anteil liegt in früh übergangenen eigenen Grenzen und der Kopplung von Selbstwert an sein Wohlbefinden.
- Isolation entsteht ohne Verbot (Szene 6): Rückzug bestraft ihre Außenkontakte, bis sie sich selbst einschränkt.

Ressourcen / Wende: Die Außenperspektive der Schwester (Szene 10) und der Nachmittag allein (Szene 11) sind Ansatzpunkte für Stabilisierung und Grenzarbeit.

Häufige Stolpersteine in der Auswertung:
- Täter-Opfer-Umkehr vermeiden: Katharinas Anpassung nicht als „lässt sich das ja gefallen" abwerten.
- Nicht ferndiagnostizieren: „narzisstisch" bleibt eine tastende Hypothese aus einseitiger Schilderung. Muster benennen, keine Persönlichkeitsdiagnose über den abwesenden Partner stellen.
- Die Abwesenheit lauter Gewalt nicht mit Harmlosigkeit verwechseln — die psychische Belastung ist hoch (distress 3–4, safety „elevated").

Mögliche Lernziele: verdeckte vs. grandiose Muster unterscheiden; Liebesentzug als Kontrolle erkennen; Eigenanteil ressourcenorientiert und ohne Beschämung herausarbeiten; erste Schritte zu Grenzen und Selbstfürsorge benennen.'),
('de401000-0000-4000-a000-0000000000e2', 'de401000-0000-4000-a000-000000000100',
 'Marlene & Deniz — Idealisierung, Entwertung, Hoovering',
 'Der klassische Zyklus in gut lesbaren Szenen: Love-Bombing, Gaslighting, Entwertung und große Versöhnungen ohne Klärung, verstärkt durch Marlenes Verlustangst. Guter didaktischer Grundfall.',
 'published', 'de401000-0000-4000-a000-0000000000c2', 2,
 ARRAY['Grandioser Narzissmus','Love-Bombing','Gaslighting','Verlustangst','Hoovering','Idealisierung-Entwertung'],
 'MUSTERLÖSUNG (Experten-Referenz, nur intern; tastend, ausdrücklich keine Diagnose)

Kernbild: Ein gut erkennbarer Zyklus aus Idealisierung → Entwertung → Rückzug → Hoovering, wie er bei grandios-narzisstisch anmutenden Beziehungsmustern häufig beschrieben wird. Marlenes ängstliche Bindung verstärkt die Bindung an das Wechselbad (Trauma-Bonding). Als Grundfall geeignet, weil die Muster klar hervortreten.

Worauf Studierende achten sollten:
- Love-Bombing (Szene 1) als Beginn: überwältigende Nähe, schnelle Zukunftsversprechen. Wichtig als Kontrastfolie zur späteren Kälte.
- Gaslighting (Szene 3, 6): Fakten werden bestritten, ihre Wahrnehmung als „überempfindlich" umgedeutet. Der gefundene Beweis (Szene 3) ist ein Lehrstück gegen die Selbst-Entwertung.
- Idealisierung-Entwertung im Wechsel (Szene 2, 4, 7): öffentliche Wärme, private Kälte; nach Eskalation die große Geste ohne inhaltliche Klärung.
- Kontrolle als Fürsorge getarnt (Szene 5) und Drohung mit Ersetzbarkeit (Szene 8) — beides erodiert Selbstwert und Autonomie.
- Bindungsdynamik: Marlenes Verlustangst macht die Entzugsphasen besonders schmerzhaft und den Sog stärker (Szene 9).

Ressourcen / Wende: Die Freundin, die zurückspiegelt „Wann geht es eigentlich dir gut?" (Szene 10), öffnet die Außenperspektive.

Häufige Stolpersteine:
- Nicht bei „er ist ein Narzisst" stehen bleiben: Muster und Wirkung beschreiben, keine Diagnose über Deniz.
- Sicherheit mitdenken: distress bis 5, „elevated". Psychoedukation zu Zyklus und Gaslighting vor Konfrontation.
- Marlenes Bleiben nicht moralisieren — Trauma-Bonding und Bindungsangst erklären das Verharren.

Mögliche Lernziele: den Zyklus benennen; Gaslighting-Sequenzen identifizieren; Bindungsdynamik und Trauma-Bonding verstehen; Sicherheits- und Stabilisierungsschritte ableiten.'),
('de401000-0000-4000-a000-0000000000e3', 'de401000-0000-4000-a000-000000000100',
 'Tobias & Nadine — Silent Treatment und Nähe-Distanz',
 'Eine leisere, deprivierende Dynamik: Nadine zieht sich zurück und schweigt, Tobias wird zum Verfolger, der um Nähe bittet. Gut, um Silent Treatment und Pursuer-Distancer-Muster ohne Dämonisierung zu üben.',
 'published', 'de401000-0000-4000-a000-0000000000c3', 2,
 ARRAY['Silent Treatment','Passiv-Aggressiv','Stonewalling','Nähe-Distanz','Emotionale Nichtverfügbarkeit'],
 'MUSTERLÖSUNG (Experten-Referenz, nur intern; tastend, ausdrücklich keine Diagnose)

Kernbild: Eine Verfolger-Rückzug-Dynamik (Pursuer-Distancer) mit Silent Treatment als zentralem Muster. Nadine reguliert Nähe und Konflikt über Rückzug und Schweigen; Tobias verfolgt, beschwichtigt und gibt sich selbst auf. Die Belastung entsteht hier eher durch Entzug (Deprivation) als durch offene Angriffe.

Worauf Studierende achten sollten:
- Silent Treatment als indirekte Steuerung (Szene 1, 4): tagelanges Schweigen ohne benannten Anlass, freundlich zu anderen, kühl zum Partner. Wirkung: Verunsicherung, Selbstbeschuldigung.
- Verleugnung des Zustands (Szene 2): „Mir geht es gut" in kaltem Ton hält Tobias im Ungewissen — er kann das Problem nicht bearbeiten, nur erspüren.
- Bedürfnisaufschub / emotionale Nichtverfügbarkeit (Szene 3, 7): wichtige Gespräche finden nie statt; Konfliktvermeidung als Stil.
- Die erlernte Verfolgerrolle (Szene 5): Tobias entschuldigt sich für Dinge, die er nicht getan hat, um die Stille zu beenden — das Muster verfestigt sich.
- Selbstwert-Erosion (Szene 8): Er hält sein legitimes Bedürfnis nach Nähe für einen Defekt.

Wichtige Differenzierung: Pursuer-Distancer-Muster sind oft wechselseitig gebaut. Nadines Rückzug kann eigene Bindungsangst/Konfliktscheu ausdrücken — das ist KEINE Entschuldigung für die deprivierende Wirkung, aber ein Schutz vor Dämonisierung und vorschneller Diagnose. Tobias'' Verfolgen ist Teil des Musters, nicht seine Schuld.

Häufige Stolpersteine:
- Nadine nicht als „kalte Täterin" zeichnen; die wechselseitige Dynamik und mögliche Bindungsangst mitdenken.
- Tobias'' Nähebedürfnis nicht pathologisieren („zu bedürftig") — genau diese Selbstabwertung ist Teil des Problems.
- Kein Persönlichkeitsurteil über die abwesende Partnerin.

Mögliche Lernziele: Silent Treatment benennen und von einfachem Konfliktrückzug unterscheiden; Pursuer-Distancer-Zyklus verstehen; Tobias'' Über-Anpassung als Anteil ressourcenorientiert bearbeiten; Wege aus der Verfolgerrolle skizzieren.')
ON CONFLICT (id) DO NOTHING;

-- ── Marktplatz-Module (kostenlos, verkaufbar, veröffentlicht) ─────────────────
INSERT INTO learning_modules (id, institute_id, title, description, didactic_guide, status, sellable, price_cents, teaser)
VALUES
('de401000-0000-4000-a000-0000000000f1', 'de401000-0000-4000-a000-000000000100',
 'Verdeckte Muster erkennen: Narzissmus & Co-Abhängigkeit',
 'Ein anspruchsvoller Fall zu verdecktem Narzissmus und co-abhängiger Anpassung, mit Einführung und Wissenscheck.',
 'Leitfaden für Dozent:innen: Nutzen Sie den Fall Katharina & Sebastian, um verdeckte von grandiosen Mustern zu unterscheiden. Empfohlener Ablauf: (1) Lektion lesen, (2) Fall in Kleingruppen analysieren — Fokus: Wo genau steuert der Rückzug? Wo wird Leistung unsichtbar gemacht? (3) Diskussion: Wie würdigt man Katharinas Anteil, ohne in Täter-Opfer-Umkehr zu geraten? Achten Sie darauf, dass die Gruppe keine Ferndiagnose stellt.',
 'published', true, 0,
 'Warum die leisen Beziehungen manchmal die zermürbendsten sind: verdeckter Narzissmus, Opferrolle und Co-Abhängigkeit an einem sorgfältig gezeichneten Fall — mit didaktischem Leitfaden und Wissenscheck.'),
('de401000-0000-4000-a000-0000000000f2', 'de401000-0000-4000-a000-000000000100',
 'Der Kreislauf: Idealisierung, Entwertung, Hoovering',
 'Der klassische narzisstisch anmutende Beziehungszyklus in gut lesbaren Szenen, mit Einführung und Wissenscheck.',
 'Leitfaden für Dozent:innen: Der Fall Marlene & Deniz eignet sich als Grundfall. Empfohlener Ablauf: (1) Lektion zum Zyklus, (2) Studierende markieren im Fall die Phasen (Love-Bombing, Entwertung, Hoovering) und die Gaslighting-Sequenzen, (3) Diskussion zu Trauma-Bonding und Verlustangst: Warum bleibt Marlene? Betonen Sie Sicherheit und Psychoedukation vor Konfrontation.',
 'published', true, 0,
 'Himmelhoch geliebt, dann kalt entwertet — und trotzdem gebunden: der Idealisierungs-Entwertungs-Hoovering-Zyklus verständlich gemacht, mit Fallszenen, Leitfaden und Wissenscheck.'),
('de401000-0000-4000-a000-0000000000f3', 'de401000-0000-4000-a000-000000000100',
 'Silent Treatment und Nähe-Distanz-Dynamiken',
 'Ein leiserer Fall zu Schweigen als Steuerung und Verfolger-Rückzug-Mustern, mit Einführung und Wissenscheck.',
 'Leitfaden für Dozent:innen: Der Fall Tobias & Nadine übt die schwierige Balance, Silent Treatment klar zu benennen, ohne die zurückziehende Person zu dämonisieren. Empfohlener Ablauf: (1) Lektion zu Pursuer-Distancer, (2) Fallanalyse mit Fokus auf Wirkung (Deprivation) UND wechselseitige Bindungsdynamik, (3) Diskussion: Wie bearbeitet man Tobias'' Über-Anpassung ressourcenorientiert?',
 'published', true, 0,
 'Wenn Schweigen die lauteste Botschaft ist: Silent Treatment, Stonewalling und die Verfolger-Rückzug-Dynamik an einem einfühlsamen Fall — mit Leitfaden und Wissenscheck.')
ON CONFLICT (id) DO NOTHING;

-- ── Modul-Schritte: Lektion → Fall → Wissenscheck ────────────────────────────
INSERT INTO learning_module_steps (id, module_id, position, kind, title, content, ref_id, payload)
VALUES
-- Modul 1
('de401000-0000-4000-a000-00000000f101', 'de401000-0000-4000-a000-0000000000f1', 0, 'lesson',
 'Verdeckter vs. grandioser Narzissmus',
 E'## Zwei Gesichter eines Musters\n\nNarzisstisch anmutende Dynamiken zeigen sich nicht immer laut. Der **grandiose** Typ tritt fordernd, abwertend und selbstsicher auf. Der **verdeckte (vulnerable)** Typ wirkt oft sensibel, gekränkt und leidend — die Steuerung läuft über **Opferrolle, Rückzug und stille Enttäuschung** statt über offene Angriffe.\n\n### Woran man verdeckte Muster erkennt\n- Chronische Kränkbarkeit; Wünsche des Gegenübers lösen Verletzung statt Dialog aus\n- **Liebesentzug** (Schweigen, Schmollen) als Reaktion auf Grenzen\n- Die eigene Leistung wird betont, die des Partners unsichtbar gemacht\n- Nach außen sympathisch, im Nahbereich emotional unerreichbar\n\n### Die co-abhängige Ergänzung\nDas Muster braucht ein Gegenüber, das **überfunktioniert**: das die Stimmung reguliert, eigene Bedürfnisse zurückstellt und den Selbstwert an das Wohlergehen des anderen koppelt. Diese Anpassung ist eine **verständliche Schutzstrategie**, kein Charakterfehler.\n\n> Merksatz: Nicht die Lautstärke entscheidet über die Belastung. Auch leise Muster können tief erschöpfen.',
 NULL, '{}'::jsonb),
('de401000-0000-4000-a000-00000000f102', 'de401000-0000-4000-a000-0000000000f1', 1, 'case',
 'Fallanalyse: Katharina & Sebastian',
 NULL, 'de401000-0000-4000-a000-0000000000e1', '{}'::jsonb),
('de401000-0000-4000-a000-00000000f103', 'de401000-0000-4000-a000-0000000000f1', 2, 'quiz',
 'Wissenscheck: Verdeckte Muster', NULL, NULL,
 '{"questions":[{"q":"Worüber steuert der verdeckt-narzisstisch anmutende Typ am ehesten?","options":["Über offene, laute Abwertung","Über Opferrolle, Kränkung und Liebesentzug","Über körperliche Drohungen","Über sachliche Kritik"],"correct":1,"explanation":"Die Steuerung läuft leise: Rückzug, Schmollen und stille Enttäuschung statt offener Aggression."},{"q":"Wie sollte man Katharinas Überfunktionieren didaktisch einordnen?","options":["Als selbst verschuldete Schwäche","Als verständliche Schutzstrategie, die zu würdigen ist","Als Beweis, dass sie das Problem ist","Als irrelevant für den Fall"],"correct":1,"explanation":"Co-abhängige Anpassung ist eine erlernte Schutzstrategie — Eigenanteil ohne Beschämung bearbeiten."},{"q":"Was ist bei der Auswertung eine Falle?","options":["Muster benennen","Sicherheit mitdenken","Eine Ferndiagnose über den abwesenden Partner stellen","Ressourcen suchen"],"correct":2,"explanation":"Aus einseitiger Schilderung keine Persönlichkeitsdiagnose ableiten — nur tastende Hypothesen."}]}'::jsonb),
-- Modul 2
('de401000-0000-4000-a000-00000000f201', 'de401000-0000-4000-a000-0000000000f2', 0, 'lesson',
 'Der Idealisierungs-Entwertungs-Zyklus',
 E'## Ein wiederkehrender Kreislauf\n\nViele narzisstisch anmutende Beziehungen folgen einem Muster:\n\n1. **Idealisierung / Love-Bombing** — überwältigende Nähe, schnelle Zukunftsversprechen\n2. **Entwertung** — Kritik, Seitenhiebe, öffentliche Bloßstellung\n3. **Rückzug / Entzug** — Kälte, Liebesentzug\n4. **Hoovering** — große Gesten und Versöhnung, meist **ohne inhaltliche Klärung**\n\nDann beginnt der Kreis von vorn.\n\n### Gaslighting\nParallel wird die Wahrnehmung des Gegenübers infrage gestellt: „Das habe ich nie gesagt", „Du bist überempfindlich". Über die Zeit **misstraut** die betroffene Person der eigenen Erinnerung.\n\n### Warum man bleibt: Trauma-Bonding\nDer Wechsel aus Strafe und Belohnung erzeugt eine starke Bindung. Eine **ängstliche Bindung / Verlustangst** verstärkt den Sog: Die Entzugsphasen sind besonders schmerzhaft, die Versöhnung besonders erleichternd.\n\n> Sicherheit zuerst: Psychoedukation zum Zyklus und zu Gaslighting steht vor jeder Konfrontation.',
 NULL, '{}'::jsonb),
('de401000-0000-4000-a000-00000000f202', 'de401000-0000-4000-a000-0000000000f2', 1, 'case',
 'Fallanalyse: Marlene & Deniz',
 NULL, 'de401000-0000-4000-a000-0000000000e2', '{}'::jsonb),
('de401000-0000-4000-a000-00000000f203', 'de401000-0000-4000-a000-0000000000f2', 2, 'quiz',
 'Wissenscheck: Der Zyklus', NULL, NULL,
 '{"questions":[{"q":"Welche Phase folgt typischerweise auf die Entwertung und den Rückzug?","options":["Dauerhafte Trennung","Hoovering — große Geste und Versöhnung ohne Klärung","Sachliche Aussprache","Nichts, der Zyklus endet"],"correct":1,"explanation":"Auf Entzug folgt die Versöhnung ohne inhaltliche Klärung — dann beginnt der Kreis von vorn."},{"q":"Was beschreibt Gaslighting am besten?","options":["Lautes Streiten","Systematisches Infragestellen der Wahrnehmung des Gegenübers","Eifersucht","Eine große Geste"],"correct":1,"explanation":"Gaslighting untergräbt das Vertrauen in die eigene Erinnerung und Wahrnehmung."},{"q":"Warum bleibt Marlene trotz des Schmerzes?","options":["Weil es ihr egal ist","Trauma-Bonding und Verlustangst verstärken die Bindung","Weil kein Muster vorliegt","Aus rein finanziellen Gründen"],"correct":1,"explanation":"Der Wechsel aus Strafe und Belohnung plus ängstliche Bindung erzeugen einen starken Sog."}]}'::jsonb),
-- Modul 3
('de401000-0000-4000-a000-00000000f301', 'de401000-0000-4000-a000-0000000000f3', 0, 'lesson',
 'Silent Treatment & Pursuer-Distancer',
 E'## Wenn Schweigen zur Botschaft wird\n\n**Silent Treatment** ist anhaltendes, absichtsvolles Schweigen — oft ohne benannten Anlass, freundlich zu anderen, kühl zum Partner. Es wirkt als **indirekte Steuerung**: Das Gegenüber wird verunsichert, sucht die Schuld bei sich und passt sich an.\n\n### Die Verfolger-Rückzug-Dynamik\nHäufig entsteht ein Kreislauf:\n- Eine Person **zieht sich zurück** (Distancer): schweigt, vertagt Gespräche, bleibt emotional unerreichbar\n- Die andere **verfolgt** (Pursuer): fragt, beschwichtigt, entschuldigt sich — auch für Dinge, die sie nicht getan hat\n\nJe mehr die eine verfolgt, desto mehr zieht sich die andere zurück. Das Muster ist **wechselseitig gebaut**.\n\n### Differenzieren statt dämonisieren\nRückzug kann eigene **Bindungsangst oder Konfliktscheu** ausdrücken. Das entschuldigt die deprivierende Wirkung nicht — schützt aber vor vorschneller Verurteilung. Und: Das Nähebedürfnis des Verfolgers ist **kein Defekt**; die Selbstabwertung („ich bin zu bedürftig") ist Teil des Problems.\n\n> Ziel ist nicht, eine Schuldige zu finden, sondern das Muster und die eigenen Anteile zu verstehen.',
 NULL, '{}'::jsonb),
('de401000-0000-4000-a000-00000000f302', 'de401000-0000-4000-a000-0000000000f3', 1, 'case',
 'Fallanalyse: Tobias & Nadine',
 NULL, 'de401000-0000-4000-a000-0000000000e3', '{}'::jsonb),
('de401000-0000-4000-a000-00000000f303', 'de401000-0000-4000-a000-0000000000f3', 2, 'quiz',
 'Wissenscheck: Rückzug & Nähe', NULL, NULL,
 '{"questions":[{"q":"Was kennzeichnet Silent Treatment?","options":["Eine einmalige, kurze Pause im Streit","Anhaltendes, absichtsvolles Schweigen als indirekte Steuerung","Eine offene Aussprache","Lautes Vorwerfen"],"correct":1,"explanation":"Es ist anhaltendes, steuerndes Schweigen — oft ohne benannten Anlass."},{"q":"Wie ist die Pursuer-Distancer-Dynamik am besten beschrieben?","options":["Einseitig durch den Distancer verschuldet","Wechselseitig gebaut: Verfolgen verstärkt Rückzug und umgekehrt","Immer harmlos","Ein Zeichen von Gleichgültigkeit beider"],"correct":1,"explanation":"Das Muster ist wechselseitig — beide Anteile gehören in die Analyse."},{"q":"Wie sollte Tobias'' Nähebedürfnis eingeordnet werden?","options":["Als krankhaftes ''zu bedürftig''","Als legitimes Bedürfnis; die Selbstabwertung ist Teil des Problems","Als Schuld an der Dynamik","Als irrelevant"],"correct":1,"explanation":"Das Bedürfnis nach Nähe ist kein Defekt — die Selbstabwertung gehört bearbeitet, nicht bestätigt."}]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ── DEMO-SEED für das Fachpersonen-Verzeichnis ──────────────────────────────
-- ⚠️  NUR DEV / CI — NICHT in Produktion einspielen!
-- Frei erfundene Fachpersonen (example.com), damit /fachpersonen und die
-- Regionalseiten in Dev/Preview sofort mit Inhalt leben. In Prod pflegst du
-- echte, recherchierte Fachpersonen ein (dieses File dort einfach auslassen).
-- Idempotent (ON CONFLICT (slug) DO NOTHING).
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO directory_listings
  (slug, display_name, profession, title, city, city_slug, postal_code, state,
   website, phone, contact_email, tier, published, verified,
   photo_url, headline, about, approach, fees, focus_areas, formats, languages, offers_free_intro)
VALUES
  -- Partner (hervorgehoben, volles Profil) ------------------------------------
  ('dr-anna-hofer-kassel', 'Dr. Anna Hofer', 'paartherapie',
   'Psychologische Psychotherapeutin, Paartherapeutin', 'Kassel', 'kassel', '34117', 'Hessen',
   'https://example.com/anna-hofer', '0561 1234567', 'anna.hofer@example.com', 'partner', true, true,
   NULL, 'Wieder ins Gespräch kommen, wenn die Worte fehlen',
   'Seit über 15 Jahren begleite ich Paare durch Krisen, Vertrauensbrüche und festgefahrene Muster. Mir ist wichtig, dass sich beide gesehen fühlen – auch dann, wenn die Positionen weit auseinanderliegen.',
   'Ich arbeite integrativ auf Basis der Emotionsfokussierten Paartherapie (EFT). Wir schauen gemeinsam auf die wiederkehrende Dynamik unter dem Streit und üben, einander wieder zu erreichen.',
   'Selbstzahler: 130 € / 60 Min. Erstgespräch kostenlos (20 Min., telefonisch).',
   ARRAY['Vertrauensbruch & Affäre','Kommunikation','Wiederkehrende Streitmuster','Trennungsklärung'],
   ARRAY['praxis','online'], ARRAY['Deutsch','Englisch'], true),

  ('markus-lindner-frankfurt', 'Markus Lindner', 'schematherapie',
   'Heilpraktiker (Psychotherapie), Schematherapeut', 'Frankfurt am Main', 'frankfurt-am-main', '60311', 'Hessen',
   'https://example.com/lindner', '069 7654321', 'kontakt@example.com', 'partner', true, true,
   NULL, 'Alte Muster verstehen – und verändern',
   'Ich unterstütze Menschen dabei, tief verankerte Beziehungsmuster zu erkennen, die immer wieder zu denselben schmerzhaften Situationen führen.',
   'Schematherapeutisch fundiert. Wir identifizieren die aktiven „Modi", verstehen ihre Herkunft und entwickeln gesündere Wege, mit Nähe und Konflikt umzugehen.',
   'Selbstzahler: 110 € / 50 Min.',
   ARRAY['Bindungsangst','Selbstwert','Narzisstische Dynamiken','Emotionale Abhängigkeit'],
   ARRAY['praxis','online','telefon'], ARRAY['Deutsch'], true),

  -- Volles Profil (nicht Partner) ---------------------------------------------
  ('sabine-vogt-kassel', 'Sabine Vogt', 'coaching',
   'Systemischer Coach, Paarberaterin', 'Kassel', 'kassel', '34119', 'Hessen',
   'https://example.com/vogt', '0561 2223344', 'sabine.vogt@example.com', 'profile', true, false,
   NULL, 'Klarheit finden, bevor große Entscheidungen anstehen',
   'Ich begleite Einzelne und Paare in Umbruchphasen – wenn eine Beziehung am Scheideweg steht oder sich immer wieder dasselbe wiederholt.',
   'Lösungs- und ressourcenorientiert, systemisch. Kurze, fokussierte Prozesse mit konkreten nächsten Schritten.',
   '95 € / 60 Min.',
   ARRAY['Trennung oder Bleiben','Neuorientierung','Kommunikation'],
   ARRAY['online','telefon'], ARRAY['Deutsch'], true),

  ('jonas-becker-berlin', 'Jonas Becker', 'paartherapie',
   'Paar- und Sexualtherapeut (M.Sc.)', 'Berlin', 'berlin', '10405', 'Berlin',
   'https://example.com/becker', '030 5566778', 'praxis@example.com', 'profile', true, false,
   NULL, 'Nähe, Sexualität und Verbindung neu gestalten',
   'Meine Praxis ist ein geschützter Raum für Paare, die sich wieder näherkommen möchten – emotional wie körperlich.',
   'Verbindung aus systemischer Paartherapie und sexualtherapeutischen Ansätzen.',
   '120 € / 60 Min.',
   ARRAY['Sexualität & Intimität','Nähe-Distanz','Kommunikation'],
   ARRAY['praxis'], ARRAY['Deutsch','Englisch'], false),

  -- Basic (zugestimmt, kein Profil) -------------------------------------------
  ('petra-schulz-kassel', 'Petra Schulz', 'paarberatung',
   'Eheberaterin (DAJEB)', 'Kassel', 'kassel', '34125', 'Hessen',
   'https://example.com/schulz', '0561 4455667', 'petra.schulz@example.com', 'basic', true, false,
   NULL, NULL, NULL, NULL, NULL, ARRAY[]::text[], ARRAY['praxis'], ARRAY['Deutsch'], true),

  ('thomas-wagner-berlin', 'Thomas Wagner', 'systemische-therapie',
   'Systemischer Therapeut (SG)', 'Berlin', 'berlin', '12043', 'Berlin',
   'https://example.com/wagner', '030 1122334', 'thomas.wagner@example.com', 'basic', true, false,
   NULL, NULL, NULL, NULL, NULL, ARRAY[]::text[], ARRAY['praxis','online'], ARRAY['Deutsch'], false),

  -- Researched (recherchiert, keine Zustimmung → Kontakt inaktiv) --------------
  ('praxis-morgenstern-kassel', 'Praxis Dr. Morgenstern', 'psychotherapie',
   'Ärztliche Psychotherapie', 'Kassel', 'kassel', '34121', 'Hessen',
   'https://example.com/morgenstern', '0561 9998877', NULL, 'researched', true, false,
   NULL, NULL, NULL, NULL, NULL, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], false),

  ('claudia-berg-hamburg', 'Claudia Berg', 'paartherapie',
   'Paartherapeutin', 'Hamburg', 'hamburg', '20095', 'Hamburg',
   'https://example.com/berg', '040 3344556', NULL, 'researched', true, false,
   NULL, NULL, NULL, NULL, NULL, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], false),

  ('institut-seelenweg-muenchen', 'Institut Seelenweg', 'traumatherapie',
   'Traumatherapie & Paarbegleitung', 'München', 'muenchen', '80331', 'Bayern',
   'https://example.com/seelenweg', '089 2233445', NULL, 'researched', true, false,
   NULL, NULL, NULL, NULL, NULL, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], false),

  ('lena-fischer-frankfurt', 'Lena Fischer', 'coaching',
   'Beziehungscoach', 'Frankfurt am Main', 'frankfurt-am-main', '60313', 'Hessen',
   'https://example.com/fischer', '069 8899001', NULL, 'researched', true, false,
   NULL, NULL, NULL, NULL, NULL, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], false)
ON CONFLICT (slug) DO NOTHING;

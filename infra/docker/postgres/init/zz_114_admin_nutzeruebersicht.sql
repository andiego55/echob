-- zz_114_admin_nutzeruebersicht.sql
-- Die Nutzeruebersicht im Admin: eine Zeile je Konto, mit dem, was man zum Betreiben
-- braucht - und nichts darueber hinaus.
--
-- WAS SICH AENDERT
-- admin_user_roles kannte drei Rollen (Fachperson, Institut, Studierende) und beantwortete
-- genau eine Frage: Wer ist was? Dazu kommen jetzt
--   1. die Klient:innen,
--   2. Tarif und Laufzeit,
--   3. Zahlen (Faelle, Szenen, Verbindungen, Studierende),
--   4. "zuletzt aktiv",
--   5. Berufsgruppe und der Stand des Schweigepflicht-Hinweises bei Fachpersonen.
--
-- WARUM KLIENT:INNEN JETZT DOCH DRINSTEHEN
-- Die Sicht liess sie bisher bewusst aus, mit der Begruendung: Was fehlt, kann nicht
-- versehentlich in eine Liste geraten. Das war richtig, solange die Liste nur Rollen
-- zeigte - fuer den Betrieb (Abrechnung, Support, Missbrauch, "lebt dieses Konto noch?")
-- braucht es sie aber, und ein Konto, das man nicht sieht, kann man auch nicht schuetzen.
--
-- Die Grenze verlaeuft deshalb nicht mehr an der Rolle, sondern am Inhalt:
--   * Pseudonym statt Klarname - mehr weiss diese Datenbank ohnehin nicht.
--   * KEINE E-Mail. Die liegt in Supabase, und sie bleibt dort.
--   * KEINE Inhalte: keine Szene, kein Titel, kein Sicherheitsstatus, keine Notiz. Zahlen
--     sagen, ob jemand arbeitet; sie sagen nicht, woran.
--
-- WARUM EINE SICHT UND KEINE ABFRAGE IM DIENST
-- Damit dieselbe Frage in psql dieselbe Antwort gibt wie im Admin-Bereich. Die Sicht ist
-- die eine Stelle, an der steht, was "ein Konto" im Admin bedeutet.
--
-- Idempotent (DROP + CREATE). Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_114_admin_nutzeruebersicht.sql

-- ── Erfundene Fallpersonen kenntlich machen ─────────────────────────────────
-- user_profiles enthaelt nicht nur Konten. Jeder generierte Ausbildungsfall und jede
-- Arbeitskopie einer/eines Studierenden legt eine Zeile mit einer synthetischen user_id
-- an - eine Fallperson, kein Mensch mit Zugang. In einer Nutzerliste waeren das
-- Karteileichen, die man zaehlt, anschreiben will und nie erreicht.
--
-- Die Unterscheidung laesst sich nicht erraten, deshalb steht sie jetzt an der Zeile. Das
-- Nachtragen fuer den Bestand geht ueber die einzige Spur, die es gibt: Der Fall dieser
-- Person haengt an einem Institutsbeispiel oder an einer Arbeitskopie.
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS synthetisch BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN user_profiles.synthetisch IS
    'Erfundene Fallperson (Ausbildungsbeispiel, Arbeitskopie, Spielwiese) statt Konto eines Menschen. Wird in der Admin-Nutzeruebersicht nicht gezaehlt.';

UPDATE user_profiles p SET synthetisch = TRUE
 WHERE NOT p.synthetisch
   AND (
     p.user_id IN (
       'dec01000-0000-4000-a000-000000000001'::uuid,
       'dec01000-0000-4000-a000-000000000002'::uuid
     )
     OR EXISTS (
       SELECT 1 FROM cases c
        WHERE c.user_id = p.user_id
          AND (
            EXISTS (SELECT 1 FROM institute_examples e
                     WHERE e.primary_case_id = c.id OR e.partner_case_id = c.id)
            OR EXISTS (SELECT 1 FROM student_case_copies k
                        WHERE k.case_id = c.id OR k.partner_case_id = c.id)
          )
     )
   );

DROP VIEW IF EXISTS admin_user_roles;

CREATE VIEW admin_user_roles AS

-- ── Klient:innen ────────────────────────────────────────────────────────────
-- zuletzt_aktiv aus drei Quellen: das Profil wird bei jeder Aenderung angefasst, Szenen
-- und Echo-Nachrichten sind die eigentliche Arbeit. Nur updated_at zu nehmen hiesse, ein
-- Konto fuer tot zu halten, das jeden Tag schreibt.
SELECT
    p.user_id,
    'client'::TEXT                                   AS rolle,
    p.display_name                                   AS name,
    NULL::TEXT                                       AS email,
    p.created_at,
    NULL::TEXT                                       AS avv_version,
    NULL::TIMESTAMPTZ                                AS avv_accepted_at,
    FALSE                                            AS im_verzeichnis,
    p.plan                                           AS tarif,
    p.subscription_ends_at                           AS tarif_bis,
    GREATEST(
        p.updated_at,
        (SELECT MAX(s.created_at) FROM scenes s WHERE s.user_id = p.user_id),
        (SELECT MAX(m.created_at) FROM echo_messages m WHERE m.user_id = p.user_id)
    )                                                AS zuletzt_aktiv,
    (SELECT COUNT(*) FROM cases c WHERE c.user_id = p.user_id
       AND c.archived_at IS NULL)                    AS faelle,
    (SELECT COUNT(*) FROM scenes s WHERE s.user_id = p.user_id)  AS szenen,
    (SELECT COUNT(*) FROM case_shares sh
      WHERE sh.owner_user_id = p.user_id AND sh.status = 'active') AS verbindungen,
    NULL::TEXT                                       AS berufsgruppe,
    NULL::TEXT                                       AS hinweis_version,
    NULL::TIMESTAMPTZ                                AS hinweis_at
FROM user_profiles p
-- Erfundene Fallpersonen sind keine Nutzer:innen: Spielwiese, Ausbildungsbeispiele,
-- Arbeitskopien Studierender.
WHERE NOT p.synthetisch

UNION ALL

-- ── Fachpersonen ────────────────────────────────────────────────────────────
-- Von AVV und Schweigepflicht-Hinweis steht jeweils die FASSUNG dabei, nicht nur der
-- Zeitpunkt: Bei einer neuen Fassung zaehlt eine alte Zustimmung nicht mehr. Ob die
-- gespeicherte die aktuelle ist, vergleicht der Dienst - die Sicht kennt sie nicht.
SELECT
    p.user_id,
    'professional'::TEXT,
    p.display_name,
    p.email,
    p.created_at,
    (SELECT a.version FROM professional_agreements a
      WHERE a.professional_user_id = p.user_id AND a.kind = 'avv'
      ORDER BY a.accepted_at DESC LIMIT 1),
    (SELECT a.accepted_at FROM professional_agreements a
      WHERE a.professional_user_id = p.user_id AND a.kind = 'avv'
      ORDER BY a.accepted_at DESC LIMIT 1),
    EXISTS (SELECT 1 FROM directory_listings d WHERE d.claimed_by_user_id = p.user_id),
    NULL::TEXT,
    NULL::TIMESTAMPTZ,
    GREATEST(
        p.updated_at,
        (SELECT MAX(m.created_at) FROM professional_echo_messages m
          WHERE m.professional_user_id = p.user_id),
        (SELECT MAX(r.updated_at) FROM professional_reports r
          WHERE r.professional_user_id = p.user_id)
    ),
    NULL::BIGINT,
    NULL::BIGINT,
    -- Verbindungen = tatsaechlich freigegebene Faelle, ohne die Spielwiese: Sie sagt
    -- nichts darueber, ob jemand mit echten Menschen arbeitet.
    (SELECT COUNT(*) FROM case_shares sh
      WHERE sh.professional_user_id = p.user_id AND sh.status = 'active'
        AND NOT sh.is_demo),
    p.profession_group,
    (SELECT a.version FROM professional_agreements a
      WHERE a.professional_user_id = p.user_id AND a.kind = 'schweigepflicht'
      ORDER BY a.accepted_at DESC LIMIT 1),
    (SELECT a.accepted_at FROM professional_agreements a
      WHERE a.professional_user_id = p.user_id AND a.kind = 'schweigepflicht'
      ORDER BY a.accepted_at DESC LIMIT 1)
FROM professional_profiles p

UNION ALL

-- ── Institute ───────────────────────────────────────────────────────────────
SELECT
    i.user_id, 'institute'::TEXT, i.name, i.email, i.created_at,
    NULL::TEXT, NULL::TIMESTAMPTZ, FALSE,
    NULL::TEXT, NULL::TIMESTAMPTZ,
    i.updated_at,
    NULL::BIGINT, NULL::BIGINT,
    (SELECT COUNT(*) FROM students s
      WHERE s.institute_id = i.id AND s.status = 'active'),
    NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ
FROM training_institutes i

UNION ALL

-- ── Studierende ─────────────────────────────────────────────────────────────
-- Nur aktive: eine entfernte Zuordnung ist keine Rolle mehr.
SELECT
    s.user_id, 'student'::TEXT, s.display_name, NULL::TEXT, s.created_at,
    NULL::TEXT, NULL::TIMESTAMPTZ, FALSE,
    NULL::TEXT, NULL::TIMESTAMPTZ,
    -- Studierende arbeiten in Kopien von Beispielfaellen; die Zuweisung ist das Letzte,
    -- was diese Datenbank ueber sie weiss, ohne in ihre Arbeit zu sehen.
    (SELECT MAX(c.assigned_at) FROM student_case_copies c WHERE c.student_id = s.id),
    (SELECT COUNT(*) FROM student_case_copies c WHERE c.student_id = s.id),
    NULL::BIGINT, NULL::BIGINT,
    NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ
FROM students s
WHERE s.status = 'active';

COMMENT ON VIEW admin_user_roles IS
    'Nutzeruebersicht fuer den Admin-Bereich: eine Zeile je Konto (Klient:in, Fachperson, '
    'Institut, Studierende) mit Rolle, Tarif, Zahlen und letzter Aktivitaet. '
    'Keine Inhalte, keine E-Mail von Klient:innen, keine Beispielkonten.';

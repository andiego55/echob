-- Migration 101: Rollenuebersicht fuer den Admin-Bereich.
--
-- WARUM DAS HIER UND NICHT IN SUPABASE STEHT
-- Die Frage "welche Rolle hat dieser Account?" laesst sich in der Supabase-
-- Nutzertabelle nicht beantworten, und zwar grundsaetzlich: auth.users liegt in der
-- Supabase-Datenbank, die Rollen liegen hier. Zwei getrennte Datenbanken, kein Join.
-- Supabase kennt nur die Anmeldung; wer eine Fachperson ist, entscheidet allein die
-- professional_profiles-Zeile in DIESER Datenbank.
--
-- Diese Sicht ist die Antwort von der Seite, auf der die Rollen tatsaechlich liegen.
-- Sie zeigt genau die Konten, die eine Rolle tragen -- Klient:innen erscheinen bewusst
-- nicht: von ihnen weiss diese Datenbank keinen Namen und keine Adresse, und das soll
-- so bleiben.
--
-- Direkt lesbar:
--   docker compose -f docker-compose.prod.yml exec -T postgres \
--     psql -U echob -d echob -c "SELECT * FROM admin_user_roles ORDER BY created_at DESC LIMIT 20;"
--
-- WARUM DIE DATEI zz_ HEISST UND NICHT 101_
-- Die Skripte hier laufen in ALPHABETISCHER Reihenfolge, nicht in numerischer. Seit
-- der 100 laeuft das auseinander: '101_' sortiert zwischen '09_' und '10_' -- also weit
-- VOR '38_training_institutes', '39_students', '62_professional_agreements' und
-- '65_directory'. Genau diese vier Tabellen braucht die Sicht. Mit numerischem Namen
-- wuerde ein frisches Schema hier abbrechen; das 'zz_' sortiert garantiert zuletzt.
-- Die 101 bleibt als Platz in der Reihe stehen.
--
-- Idempotent (CREATE OR REPLACE). Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_101_admin_user_roles.sql

CREATE OR REPLACE VIEW admin_user_roles AS

-- Fachpersonen: dazu der AVV-Stand, weil das die zweite Frage ist, die man immer
-- gleich danach hat. Die Version (nicht nur der Zeitpunkt) steht dort, weil bei einer
-- neuen Vertragsfassung eine alte Zustimmung nicht mehr zaehlt.
SELECT
    p.user_id,
    'professional'::TEXT AS rolle,
    p.display_name       AS name,
    p.email,
    p.created_at,
    (SELECT a.version FROM professional_agreements a
      WHERE a.professional_user_id = p.user_id AND a.kind = 'avv'
      ORDER BY a.accepted_at DESC LIMIT 1)     AS avv_version,
    (SELECT a.accepted_at FROM professional_agreements a
      WHERE a.professional_user_id = p.user_id AND a.kind = 'avv'
      ORDER BY a.accepted_at DESC LIMIT 1)     AS avv_accepted_at,
    EXISTS (SELECT 1 FROM directory_listings d
             WHERE d.claimed_by_user_id = p.user_id) AS im_verzeichnis
FROM professional_profiles p

UNION ALL

SELECT
    i.user_id, 'institute'::TEXT, i.name, i.email, i.created_at,
    NULL::TEXT, NULL::TIMESTAMPTZ, FALSE
FROM training_institutes i

UNION ALL

-- Nur aktive Studierende: eine entfernte Zuordnung ist keine Rolle mehr.
SELECT
    s.user_id, 'student'::TEXT, s.display_name, NULL::TEXT, s.created_at,
    NULL::TEXT, NULL::TIMESTAMPTZ, FALSE
FROM students s
WHERE s.status = 'active';

COMMENT ON VIEW admin_user_roles IS
    'Rollenuebersicht (Fachperson/Institut/Studierende) inkl. AVV-Stand. '
    'Nur fuer den Admin-Bereich und psql -- Klient:innen sind absichtlich nicht enthalten.';

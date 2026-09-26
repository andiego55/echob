-- zz_135_freigabe_traumbeziehung.sql
-- Ein fuenfter Kompass-Inhalt wird freigebbar: die Traumbeziehungs-Skizze.
--
-- WARUM GERADE DIE
-- Eine Fachperson bekommt von ihrer Klient:in vor allem zu hoeren, was nicht geht. Was die
-- Person WILL, kommt selten vor - und wenn, dann als Verneinung ("nicht mehr so wie
-- bisher"). Die Skizze ist die klarste Aussage darueber, die es in dieser Anwendung gibt,
-- und sie ist in zwanzig Sekunden gelesen: ein paar gewichtete Wuensche, eine Reihenfolge,
-- ein paar Abwaegungen, ein eigener Satz.
--
-- WELCHE SKIZZE
-- Die zur Beziehungsart DIESES Falls - und nur die. Dieselbe Regel wie beim Vergleich:
-- Ein Partnerschafts-Wunsch an einem Elternfall waere kein Zusatzwissen, sondern eine
-- Verwechslung, die sich wie eine Aussage ueber einen Menschen liest. Gibt es zur Art des
-- Falls keine Skizze, kommt nichts mit; die Freigabe laeuft dann einfach leer.
--
-- Und ausdruecklich NICHT die uebrigen Arten. Wer seinen Partnerschaftsfall teilt, hat
-- nicht seine Wuensche an seine Eltern, seine Freunde und seinen Arbeitsplatz mitgeteilt.
--
-- WAS NICHT MITGEHT
-- Die blinde Neufassung (`entwurf`) und die abgeloeste Vorfassung (`vorher`). Ein Entwurf
-- ist keine Aussage - dieselbe Regel wie beim Gefuehlsbild, wo nur das BESTAETIGTE Bild
-- freigegeben wird. Und was jemand frueher einmal wollte, hat er nicht freigegeben.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_135_freigabe_traumbeziehung.sql

ALTER TABLE case_share_elements
    DROP CONSTRAINT IF EXISTS case_share_elements_element_type_check;

ALTER TABLE case_share_elements
    ADD CONSTRAINT case_share_elements_element_type_check
    CHECK (element_type IN (
        'case_info', 'onboarding', 'all_scenes', 'scene',
        'scales', 'reports', 'topic_summaries', 'person_profile', 'self_profile',
        'hypotheses', 'test_results',
        'documents', 'artifacts',
        'gefuehlsbild',
        'satz',
        'verlauf', 'vorhaben', 'krisenplan',
        -- Neu: die Skizze der gewuenschten Beziehung, passend zur Art dieses Falls.
        'traumbeziehung'
    ));

COMMENT ON COLUMN case_share_elements.element_type IS
    'Art des freigegebenen Inhalts. Die Liste steht zusaetzlich in '
    'app/schemas/professional.py (ShareElementType) und im Frontend; '
    'app/tests/test_freigabe_elemente.py haelt beides zusammen.';

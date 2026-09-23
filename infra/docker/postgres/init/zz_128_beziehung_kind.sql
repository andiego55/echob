-- zz_128_beziehung_kind.sql
-- Eine neue Beziehungsart: das eigene Kind.
--
-- WARUM SIE FEHLTE, UND WARUM DAS NICHT EGAL IST
-- Bisher gab es "Elternteil / Familie" - also die Beziehung nach OBEN und zur Seite. Wer
-- an der Beziehung zum eigenen erwachsenen Sohn oder zur eigenen Tochter arbeitet, fand
-- sich in keiner Antwort wieder und musste "Familie" oder "Sonstige" waehlen. Das ist
-- keine Kleinigkeit: Die Art steht spaeter in jedem Prompt, den Echo ueber diesen Fall
-- sieht, und "Familie" traegt dort nichts von dem, was diese Beziehung ausmacht.
--
-- WARUM DIE BEDINGUNG MIT MUSS
-- relationship_type traegt eine CHECK-Bedingung. Ein neues Wort NUR im Literal des
-- Schemas einzutragen reicht nicht - das INSERT faellt dann erst in der Datenbank, also
-- nachdem die Person das ganze Formular ausgefuellt hat, und die Meldung sagt ihr nichts.
-- Dieselbe Bauart Fehler wie bei thread_type, beim Freigabe-Element und bei den
-- Berichtsarten; sie hat in dieser Codebasis schon mehrfach zugeschlagen.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_128_beziehung_kind.sql

ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_relationship_type_check;

ALTER TABLE cases
    ADD CONSTRAINT cases_relationship_type_check
    CHECK (relationship_type IN (
        'partner', 'ex_partner', 'family', 'child', 'friendship',
        'work', 'co_parenting', 'other', 'own_patterns'
    ));

COMMENT ON COLUMN cases.relationship_type IS
    'Art der Beziehung. Werte zusaetzlich in app/schemas/case.py (Literal) und in den '
    'Beschriftungen von echo_service.py, case_generation_service.py und dem Frontend. '
    'Ein Waechter haelt Literal und Bedingung zusammen.';

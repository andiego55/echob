-- zz_133_bericht_ideal_delta.sql
-- Eine neue Berichtsart: "Wunsch und Wirklichkeit" (ideal_delta).
--
-- WAS SIE IST
-- Der Vergleich einer Traumbeziehungs-Skizze (selbst_ideale, zz_132) mit einem Fall
-- DERSELBEN Art. Ergebnis ist ein Bericht wie jeder andere: er liegt am Fall, er laesst
-- sich der Fachperson freigeben, er geht in den PDF-Export, in den Datenexport und in die
-- Loeschung - und er zaehlt gegen dasselbe Monatskontingent wie die uebrigen Berichte.
--
-- WARUM ER IN DIESE TABELLE GEHOERT UND NICHT IN EINE EIGENE
-- Ein Delta ist kein Ding, das jemand ueber sich festhaelt, sondern ein erzeugter Text
-- ueber einen Fall. Genau das sind Berichte. Eine eigene Tabelle haette Freigabe, Export,
-- Loeschung und Kostenschutz ein zweites Mal gebraucht - vier Stellen, an denen etwas
-- fehlen kann, fuer nichts.
--
-- DIE REIHENFOLGE, UM DIE ES HIER GEHT
-- Die CHECK-Bedingung ist die Stelle, die beim Bauen eines Features niemand aufmacht. Bei
-- 'partner' hat genau das zugeschlagen (siehe zz_116): Die Anfrage kam durch, das Modell
-- schrieb den ganzen Bericht, die Person wartete eine Minute - und DANN brach das INSERT
-- ab. Seitdem vergleicht app/tests/test_berichtsarten.py Bedingung, Literal und Etiketten
-- miteinander. Dieser Eintrag existiert, damit der Waechter gruen bleibt und die Reihenfolge
-- nicht noch ein drittes Mal jemanden kostet.
--
-- Die Bedingung wird ersetzt statt ergaenzt - eine CHECK-Bedingung laesst sich nicht
-- erweitern. Idempotent (DROP IF EXISTS + ADD).
--
-- Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_133_bericht_ideal_delta.sql

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_report_type_check;

ALTER TABLE reports ADD CONSTRAINT reports_report_type_check
    CHECK (report_type IN (
        'short', 'pattern', 'coaching_prep', 'therapy_prep', 'progress', 'partner',
        'ideal_delta'
    ));

-- zz_116_bericht_gegenueber.sql
-- "Nachricht fuer das Gegenueber" laesst sich nicht speichern - die Pruefbedingung kennt
-- den Berichtstyp nicht.
--
-- WAS PASSIERT IST
-- Der Berichtstyp 'partner' existiert ueberall: im Frontend als eigene Karte, im
-- Pydantic-Literal, in den Etiketten, und in der Erzeugung sogar mit einer eigenen,
-- bewusst datensparsamen Behandlung (keine Szenen, keine Skalen, keine Hypothesen - es
-- soll ja das Gegenueber lesen). Nur die CHECK-Bedingung aus 02_app.sql kennt ihn nicht.
--
-- Die Folge ist die unangenehmste Reihenfolge, die es gibt: Die Anfrage geht durch, das
-- Modell schreibt den ganzen Bericht, die nutzende Person wartet - und ERST DANN bricht
-- das INSERT an der Bedingung ab. Was ankommt, ist ein "Datenbankfehler" nach einer
-- Minute Wartezeit, und der erzeugte Text ist weg.
--
-- WARUM DAS NIEMANDEM AUFFIEL
-- Es gibt keinen Fehler zur Bauzeit, keinen roten Test und keine Warnung: Vier Stellen
-- sagen 'partner', eine sagt es nicht - und die eine liegt in einer Datei, die man beim
-- Bauen eines Features nicht aufmacht. Dieselbe Klasse Fehler wie beim Gefuehlsbild
-- (Freigabe-Element) und beim thread_type. Ein Waechter vergleicht die Bedingung jetzt
-- mit dem Literal und den Etiketten: app/tests/test_berichtsarten.py.
--
-- Die Bedingung wird ersetzt statt ergaenzt - eine CHECK-Bedingung laesst sich nicht
-- erweitern. Idempotent (DROP IF EXISTS + ADD).
--
-- Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_116_bericht_gegenueber.sql

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_report_type_check;

ALTER TABLE reports ADD CONSTRAINT reports_report_type_check
    CHECK (report_type IN (
        'short', 'pattern', 'coaching_prep', 'therapy_prep', 'progress', 'partner'
    ));

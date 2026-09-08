-- Migration 105: Was bei bereits widerrufenen Freigaben liegengeblieben ist.
--
-- WAS HIER PASSIERT
-- Diese Migration LOESCHT Daten. Sie ist die einzige im Projekt, die das tut, und sie
-- tut es mit Absicht.
--
-- WARUM
-- Ein Widerruf setzte case_shares.status auf 'revoked'. Das sperrte den Zugriff - es
-- loeschte nichts. Berichte, Arbeitsmappe und die Echo-Gespraeche der Fachperson blieben
-- in den Tabellen stehen, obwohl sie vollstaendig aus dem Material der Klient:in
-- erzeugt worden waren. Der Satz "du kannst jederzeit widerrufen, danach ist es weg" war
-- damit eine Anzeigeeinstellung.
--
-- Ab sofort raeumt der Widerruf selbst auf (sharing_service.loesche_fallgebundenes_material).
-- Diese Migration holt nach, was vor dieser Aenderung liegengeblieben ist. Ohne sie
-- gaelte das Versprechen nur fuer kuenftige Widerrufe - und das waere keins.
--
-- WAS NICHT GELOESCHT WIRD
-- Die Sitzungsnotizen, der Fallueberblick, die Vereinbarungen und die Termine der
-- Fachperson. Das ist ihre Behandlungsdokumentation; § 630f BGB verpflichtet sie, die
-- zehn Jahre aufzubewahren, und Art. 17 Abs. 3 lit. b DSGVO nimmt genau solche Faelle vom
-- Loeschanspruch aus. Eine Patientin kann die Dokumentationspflicht ihrer Therapeutin
-- nicht widerrufen. Erreichbar bleiben sie ueber /professional/archiv.
--
-- Aus den Vereinbarungen wird nur die Spalte `response` geleert: Die Vereinbarung hat die
-- Fachperson erteilt, die Antwort darin stammt von der Klient:in.
--
-- Idempotent (loescht nur, was noch da ist). Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_105_widerruf_raeumt_auf.sql

-- Ueber eine Schleife statt sechs fester DELETEs, und mit to_regclass abgesichert:
-- Faellt eine dieser Tabellen auf einem aelteren Stand, soll NICHT die ganze Bereinigung
-- abbrechen. Eine Aufraeum-Migration, die beim ersten fehlenden Tisch alles stehenlaesst,
-- raeumt nichts auf - und niemand merkt es, weil "ERROR" nach einem Fehler aussieht, der
-- nichts kaputtgemacht hat.

DO $$
DECLARE
    tabelle TEXT;
    entfernt BIGINT;
    gesamt BIGINT := 0;
BEGIN
    -- Alle Paare (Fachperson, Fall), deren Freigabe widerrufen ist und fuer die es keine
    -- andere, noch aktive Freigabe desselben Falls an dieselbe Person gibt.
    CREATE TEMP TABLE _widerrufen ON COMMIT DROP AS
    SELECT DISTINCT s.professional_user_id, s.case_id
      FROM case_shares s
     WHERE s.status = 'revoked'
       AND NOT EXISTS (
            SELECT 1 FROM case_shares a
             WHERE a.case_id = s.case_id
               AND a.professional_user_id = s.professional_user_id
               AND a.status = 'active');

    FOREACH tabelle IN ARRAY ARRAY[
        'professional_reports',
        'professional_findings',
        'professional_echo_summaries',
        'professional_echo_messages',
        'professional_echo_sessions',
        'case_faq_runs'
    ] LOOP
        IF to_regclass('public.' || tabelle) IS NULL THEN
            RAISE NOTICE 'uebersprungen (Tabelle fehlt): %', tabelle;
            CONTINUE;
        END IF;
        EXECUTE format(
            'DELETE FROM %I t USING _widerrufen w '
            ' WHERE t.case_id = w.case_id AND t.professional_user_id = w.professional_user_id',
            tabelle);
        GET DIAGNOSTICS entfernt = ROW_COUNT;
        gesamt := gesamt + entfernt;
        RAISE NOTICE '% : % Zeilen geloescht', tabelle, entfernt;
    END LOOP;

    -- Die Vereinbarung hat die Fachperson erteilt und bleibt. Die Antwort darin stammt
    -- von der Klient:in und geht.
    IF to_regclass('public.professional_assignments') IS NOT NULL THEN
        UPDATE professional_assignments a SET response = NULL, responded_at = NULL
          FROM _widerrufen w
         WHERE a.case_id = w.case_id AND a.professional_user_id = w.professional_user_id
           AND a.response IS NOT NULL;
        GET DIAGNOSTICS entfernt = ROW_COUNT;
        RAISE NOTICE 'professional_assignments.response : % geleert', entfernt;
    END IF;

    -- Ein Fall-FAQ hing ohnehin an der Freigabe; das Haekchen darf nicht stehenbleiben.
    IF to_regclass('public.case_shares') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'case_shares' AND column_name = 'faq_enabled') THEN
        UPDATE case_shares SET faq_enabled = FALSE WHERE status = 'revoked' AND faq_enabled;
    END IF;

    RAISE NOTICE 'Bereinigung fertig: % Zeilen insgesamt geloescht.', gesamt;
END $$;

-- zz_120_satz_freigabe.sql
-- Einen einzelnen Satz ueber sich an eine Fachperson geben.
--
-- WARUM JE SATZ UND NICHT ALS KATEGORIE
-- Die anderen Inhalte gibt man als Ganzes frei: alle Szenen, alle Skalen. Bei den
-- Saetzen ueber die eigene Person waere das ein geoeffnetes Selbstbild - und genau das
-- soll es nicht sein. Freigegeben wird ein einzelnes Stueck, bewusst ausgewaehlt. Deshalb
-- bekommt 'satz' eine eigene Spalte, so wie 'scene' eine hat.
--
-- DER STOLPERSTEIN, DER DABEI FAST UEBERSEHEN WURDE
-- uq_share_element_category verhindert, dass eine Kategorie zweimal freigegeben wird -
-- mit der Bedingung "WHERE scene_id IS NULL". Eine Satz-Zeile hat aber ebenfalls keine
-- scene_id. Ohne die Ergaenzung unten fiele der ZWEITE freigegebene Satz in denselben
-- eindeutigen Index wie der erste und wuerde abgewiesen: Man koennte genau einen Satz
-- freigeben, und der Fehler saehe aus wie ein Zufall.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_120_satz_freigabe.sql

-- ── 1) Die Art ──────────────────────────────────────────────────────────────
ALTER TABLE case_share_elements DROP CONSTRAINT IF EXISTS case_share_elements_element_type_check;
ALTER TABLE case_share_elements ADD CONSTRAINT case_share_elements_element_type_check
    CHECK (element_type IN (
        'case_info', 'onboarding', 'all_scenes', 'scene',
        'scales', 'reports', 'topic_summaries', 'person_profile', 'self_profile',
        'hypotheses', 'test_results',
        'documents', 'artifacts',
        'gefuehlsbild',
        'satz'
    ));

-- ── 2) Welcher Satz ─────────────────────────────────────────────────────────
-- ON DELETE CASCADE: Wer einen Satz loescht, nimmt ihn damit auch aus jeder Freigabe.
-- Alles andere waere eine Einsicht, die man nicht mehr zurueckholen kann.
ALTER TABLE case_share_elements
    ADD COLUMN IF NOT EXISTS satz_id UUID REFERENCES selbst_saetze (id) ON DELETE CASCADE;

COMMENT ON COLUMN case_share_elements.satz_id IS
    'Nur bei element_type=''satz''. Ein einzeln freigegebener Satz aus dem Kompass.';

-- ── 3) Die eindeutigen Indizes zurechtruecken ───────────────────────────────
-- Eine Kategorie je Freigabe - jetzt auch abgegrenzt gegen die Satz-Zeilen.
DROP INDEX IF EXISTS uq_share_element_category;
CREATE UNIQUE INDEX IF NOT EXISTS uq_share_element_category
    ON case_share_elements (share_id, element_type)
    WHERE scene_id IS NULL AND satz_id IS NULL;

-- … und ein Satz je Freigabe nur einmal.
CREATE UNIQUE INDEX IF NOT EXISTS uq_share_element_satz
    ON case_share_elements (share_id, satz_id) WHERE satz_id IS NOT NULL;

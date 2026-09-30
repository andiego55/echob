-- zz_138_freigabe_podcasts.sql
-- Ein weiterer Inhalt wird freigebbar: die Podcast-Folgen dieses Falls.
--
-- WARUM
-- Eine Folge ist der einzige Text in dieser Anwendung, den die Person fuer SICH hat machen
-- lassen und nicht fuer eine Fachperson. Ein Bericht ist auf Weitergabe hin geschrieben; ein
-- Podcast ist die eigene Lage, in der Reihenfolge, in der die Person sie hoeren wollte, mit
-- den Reglern, die sie gesetzt hat. Was jemand in den Mittelpunkt gestellt und was er
-- abgewaehlt hat, ist selbst eine Aussage.
--
-- WAS MITGEHT: DER TEXT. NICHT DIE TONSPUR.
-- Das ist kein Vorenthalten, sondern das Gegenteil: Der gesprochene Text IST der
-- Kapiteltext. Eine Fachperson liest in zwei Minuten, was zwanzig Minuten lang gesprochen
-- wird - und zwei Megabyte je Folge durch einen Weg zu schicken, der fuer Text gebaut ist,
-- waere ein zweiter Ausliefer-Endpunkt mit eigener Rechtepruefung fuer keinen Gewinn. Wer
-- die Aufnahme hoeren lassen will, spielt sie im Gespraech vor.
--
-- WAS IM PROMPT LANDET: NUR DIE LISTE.
-- Wichtiger Unterschied zu allen anderen Elementen, und er ist bewusst.
--
-- Ein Podcast-Skript ist AUS dem Material entstanden, das die Fachperson ohnehin hat:
-- Szenen, Skalen, Themendialoge. Ins Kontextfenster gelegt, kaeme derselbe Fall ein zweites
-- Mal hinein - als fluessiger Text, der sich wie eine Quelle liest. Ein Modell, das eine
-- Zusammenfassung neben ihren Belegen sieht, zitiert die Zusammenfassung: Sie ist besser
-- formuliert. Damit wuerde unsere eigene Verdichtung zur Tatsache.
--
-- Der Prompt bekommt deshalb nur Format, Titel und Datum - dass es die Folge GIBT, ist die
-- Information. Der Text selbst steht in der Anzeige, wo ein Mensch ihn liest und einordnet.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_138_freigabe_podcasts.sql

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
        'traumbeziehung',
        -- Neu: die Podcast-Folgen dieses Falls, als Text.
        'podcasts'
    ));

COMMENT ON COLUMN case_share_elements.element_type IS
    'Art des freigegebenen Inhalts. Die Liste steht zusaetzlich in '
    'app/schemas/professional.py (ShareElementType) und im Frontend; '
    'app/tests/test_freigabe_elemente.py haelt beides zusammen.';

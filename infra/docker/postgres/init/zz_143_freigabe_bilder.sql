-- zz_143_freigabe_bilder.sql
-- Ein weiterer Inhalt wird freigebbar: die Bilder aus der Bildwerkstatt.
--
-- WARUM
-- Ein Bild ist das Einzige in dieser Anwendung, das die Person nicht lesen, sondern ansehen
-- kann - und das Erste, was sie in einem Gespraech von sich aus hinhalten wuerde. "So sieht
-- es bei mir aus" ist ein Satz, fuer den es sonst keine Form gibt.
--
-- WAS MITGEHT: DIE BILDER SELBST.
-- Anders als beim Podcast (zz_138), wo der Text die Folge IST und die Tonspur nur ihre
-- Aufnahme. Hier sind die Bytes der Inhalt; es gibt keinen Text, der sie ersetzt. Also
-- braucht es - und nur deshalb - einen zweiten Ausliefer-Endpunkt mit eigener
-- Rechtepruefung (`professional_bilder.py`).
--
-- Dazu gehen die Legende und der Satz der Person mit. Ein Bild ohne seine Legende ist eine
-- Projektionsflaeche: Eine Fachperson, die nicht weiss, dass die Tuer im Flur aus einer
-- bestimmten Szene kommt, deutet sie - und deutet dann unser Bild statt der Lage.
--
-- WAS NICHT MITGEHT: DER ECHO-KONTEXT. GAR NICHTS DAVON.
-- Das ist die Bedingung, unter der es diese Freigabe gibt, und sie ist strenger als bei jedem
-- anderen Element. Beim Podcast geht die Liste in den Prompt ("dass es die Folge gibt, ist die
-- Information"). Hier geht nichts hinein: kein Titel, kein Satz, keine Legende, keine Zahl.
--
-- Zwei Gruende. Erstens ist ein Bild aus demselben Material entstanden, das im Prompt schon
-- steht - dieselbe Ueberlegung wie beim Podcast, nur ohne den Rest-Nutzen. Zweitens, und das
-- ist der eigentliche: Ein Bild ist eine Deutung in Bildform, die ein Mensch ansieht und
-- einordnet. Als Text in einem Prompt wuerde daraus eine Behauptung ueber den Fall, formuliert
-- von uns, zitiert von einem Modell - und niemand koennte ihr widersprechen.
--
-- Deshalb liegen die Bilder NICHT im `SharedBundle`: Was nicht im Buendel ist, kann auch nicht
-- in das Kontextband geraten, das daraus gebaut wird. Es gibt keinen Weg, nicht nur keine
-- Absicht. Ein Waechter faehrt den ganzen Weg ab und verlangt, dass Satz, Legende und Titel
-- im Kontext nicht vorkommen.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_143_freigabe_bilder.sql

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
        'podcasts',
        -- Neu: die Bilder dieses Falls. Nur zum Ansehen, nie im Prompt.
        'bilder'
    ));

COMMENT ON COLUMN case_share_elements.element_type IS
    'Art des freigegebenen Inhalts. Die Liste steht zusaetzlich in '
    'app/schemas/professional.py (ShareElementType) und im Frontend; '
    'app/tests/test_freigabe_elemente.py haelt beides zusammen. '
    'Ausnahme bei ''bilder'': Diese gehen NICHT in das Kontextband der Fachperson - '
    'sie liegen deshalb gar nicht im SharedBundle.';

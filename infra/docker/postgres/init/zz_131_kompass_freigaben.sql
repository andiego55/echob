-- zz_131_kompass_freigaben.sql
-- Drei neue freigebbare Inhalte aus dem Kompass.
--
-- WARUM
-- Der Bauplan nennt vier Kompass-Inhalte, die eine Fachperson sehen koennen soll:
--
--   Meine Saetze    bestaetigte Saetze mit Art und Datum   (gibt es seit zz_120)
--   Mein Verlauf    Kurven, KEINE Tagebuchtexte
--   Meine Vorhaben  Ziele und Schritte mit Stand
--   Mein Krisenplan der eigene Plan fuer den Notfall
--
-- Bisher erreichte nur der erste die Fachperson. Diese Migration ergaenzt die drei
-- uebrigen.
--
-- DER VERLAUF IST KEINE AUSNAHME VON DER REGEL, SONDERN IHRE ANWENDUNG
-- Derselbe Bauplan sagt: "Ausdruecklich nie freigebbar: die rohen Pulse mit Freitext und
-- die Gespraeche in den Uebungen. Das ist die Kladde, nicht das Ergebnis."
--
-- Ein Puls traegt aber BEIDES: eine Zahl (Zustand, Anspannung) und Freitext (Notiz, was
-- geholfen hat). Freigegeben wird deshalb nur die Zahl. Das ist keine Feinheit der
-- Anzeige - es entscheidet der Dienst beim Laden, und ein Waechter prueft es ueber den
-- echten Weg. Wuerde die Zeile einfach durchgereicht, kaeme der Tagebuchtext
-- entschluesselt mit, und niemand saehe es der Freigabe an.
--
-- WARUM DREI WOERTER UND NICHT EIN "kompass"
-- Ein Sammelwort waere bequem und falsch: Der Krisenplan ist das, was viele zuerst teilen
-- wollen, der Verlauf das, was manche nie teilen wollen. Wer nur eines davon geben will,
-- muesste bei einem Sammelwort alles geben - und gaebe dann gar nichts.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_131_kompass_freigaben.sql

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
        -- Neu: die uebrigen drei Kompass-Inhalte.
        'verlauf', 'vorhaben', 'krisenplan'
    ));

COMMENT ON COLUMN case_share_elements.element_type IS
    'Art des freigegebenen Inhalts. Die Liste steht zusaetzlich in '
    'app/schemas/professional.py (ShareElementType), in SHARE_ELEMENT_LABELS und in der '
    'Ankreuzliste der Freigabe-Seite. Vier Stellen, zwei Waechter.';

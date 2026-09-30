-- zz_142_bild_regie.sql
-- Die Bildregie: der Bildauftrag und die Legende wandern mit dem Bild.
--
-- WARUM DIE LEGENDE GESPEICHERT WIRD, OBWOHL SIE BERECHENBAR IST
-- Aus denselben Gruenden wie das SVG (siehe zz_140), nur schaerfer: Sie ist berechenbar
-- solange die Bildsprache unveraendert bleibt. Heute ist genau das nicht mehr wahr - die
-- Muster-Saetze haben sich in dieser Woche zweimal geaendert, und die Dichte der Szenen traegt
-- seit heute gar nichts mehr. Eine neu gerechnete Legende wuerde einem alten Bild also
-- erklaeren, was NICHT darauf ist.
--
-- Vorher war die Legende nur in der Antwort des Malens enthalten. Wer die Seite neu lud, hatte
-- ein Bild ohne Erklaerung - und eine Metapher, die niemand aufloest, ist Dekoration.
--
-- WARUM DIE REGIE DANEBEN LIEGT
-- Sie ist die Auskunft darueber, WORAUS das Bild entstanden ist. Der Prompt allein sagt das
-- nicht mehr vollstaendig: Seit ein Sprachmodell den Bildauftrag schreibt, steht die
-- eigentliche Entscheidung - welche Gegenstaende aus dem Fall ins Bild kommen - in der Regie
-- und nicht im Katalog. Bei einem erfundenen Bild ueber das Leben eines Menschen ist das die
-- ganze Nachvollziehbarkeit, die es gibt.
--
-- BEIDE FELDVERSCHLUESSELT, WIE DER PROMPT
-- Sie enthalten Gegenstaende aus den eigenen Texten der Person ("die Tasche im Flur"). Das ist
-- ihr Material und wird wie jeder eigene Text behandelt. Als TEXT mit JSON darin, nicht als
-- JSONB: Verschluesselt ist es eine Zeichenkette, und eine Spalte, in der manchmal Geheimtext
-- und manchmal echtes JSON steht, wird irgendwann falsch gelesen.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_142_bild_regie.sql

ALTER TABLE case_bilder ADD COLUMN IF NOT EXISTS legende TEXT;
ALTER TABLE case_bilder ADD COLUMN IF NOT EXISTS regie    TEXT;

COMMENT ON COLUMN case_bilder.legende IS
    'Was im Bild wofuer steht, als JSON-Liste [{was, wofuer}], feldverschluesselt. '
    'Gespeichert und nicht neu gerechnet: Die Bildsprache aendert sich, das Bild nicht.';

COMMENT ON COLUMN case_bilder.regie IS
    'Der Bildauftrag, den ein Sprachmodell aus dem Fall geschrieben hat, als JSON, '
    'feldverschluesselt. Leer bei Bildern aus dem Baukasten und bei gerechneten.';

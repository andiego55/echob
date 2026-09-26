-- zz_134_ideal_neu_sehen.sql
-- "Stimmt das noch?" - eine Skizze blind neu machen und den Unterschied sehen.
--
-- WORUM ES GEHT
-- Ein Ideal veraltet leise. Was man sich mit dreissig wuenscht, ist mit vierzig ein anderer
-- Satz - und niemand merkt den Wechsel, weil die alte Skizze weiter dasteht und weiter
-- stimmt. Die interessanteste Frage dieses Moduls ist deshalb: Wuerdest du das heute noch
-- einmal so aufschreiben?
--
-- Sie laesst sich nur beantworten, wenn man es TUT - und zwar, ohne die alte Fassung dabei
-- zu sehen. Wer sie sieht, haekelt sie nach; das ist keine Boswilligkeit, sondern wie
-- Erinnerung funktioniert. Deshalb entsteht die neue Skizze blind, und erst danach liegen
-- beide nebeneinander.
--
-- ZWEI SPALTEN, KEINE NEUE TABELLE
--   entwurf    Die blinde Neufassung, solange sie in Arbeit ist. Sie braucht einen Platz
--              auf dem Server, weil vier Schritte nichts sind, was man in einem Rutsch
--              erledigt - ein Reload duerfte sie nicht kosten.
--   vorher     Die zuletzt abgeloeste Fassung, EINE, nicht alle. Ohne sie waere das, was
--              wir gerade als interessant erkannt haben, im Moment des Uebernehmens weg.
--              Eine vollstaendige Geschichte waere eine eigene Tabelle mit eigener
--              Loeschung, eigenem Export und eigener Anzeige - und niemand hat danach
--              gefragt. Eine Fassung zurueck reicht fuer den Satz "das hast du damals
--              anders gesehen".
--   vorher_at  Wann die abgeloeste Fassung zuletzt geaendert wurde. Ohne den Zeitpunkt ist
--              ein Unterschied keine Bewegung, sondern nur ein Unterschied.
--
-- Beide Inhaltsspalten sind feldverschluesselt wie `inhalt` - es ist derselbe Text.
-- Und sie haengen an derselben Zeile: Loeschung und Datenexport erfassen sie damit
-- automatisch mit, ohne dass irgendwo eine Liste ergaenzt werden muss.
--
-- Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_134_ideal_neu_sehen.sql

ALTER TABLE selbst_ideale ADD COLUMN IF NOT EXISTS entwurf    JSONB;
ALTER TABLE selbst_ideale ADD COLUMN IF NOT EXISTS vorher     JSONB;
ALTER TABLE selbst_ideale ADD COLUMN IF NOT EXISTS vorher_at  TIMESTAMPTZ;

COMMENT ON COLUMN selbst_ideale.entwurf   IS 'Blinde Neufassung in Arbeit; die alte bleibt bis zum Uebernehmen unangetastet';
COMMENT ON COLUMN selbst_ideale.vorher    IS 'Die zuletzt abgeloeste Fassung - genau eine, keine Geschichte';
COMMENT ON COLUMN selbst_ideale.vorher_at IS 'Wann die abgeloeste Fassung zuletzt geaendert wurde';

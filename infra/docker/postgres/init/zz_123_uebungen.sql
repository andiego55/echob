-- zz_123_uebungen.sql
-- Gefuehrte Uebungen: ein Satz kann jetzt auch aus einer Uebung stammen.
--
-- WAS EINE UEBUNG IST - UND WARUM SIE KEINE TABELLE BEKOMMT
-- Der Bauplan sagt es deutlich: "Ein neues Werkzeug ist Inhalt, kein Schema. Scham-Arbeit
-- ergaenzen heisst: einen Katalogeintrag und einen gefuehrten Ablauf schreiben, der am
-- Ende einen Satz oder ein Vorhaben erzeugt. Keine Tabelle, keine Migration."
--
-- Diese Migration ist deshalb die einzige, die es fuer Uebungen je geben sollte: Sie
-- traegt EIN Wort nach. Die Uebungen selbst stehen in kompass_uebungen.py, und eine
-- vierte kostet dort einen Eintrag.
--
-- WARUM DAS WORT VORHER FEHLTE
-- Im Konzept steht seit jeher, ein Satz traegt "eine Herkunft (aus welcher Szene, welchem
-- Puls, welcher Uebung)". In zz_118 sind nur drei davon in die Bedingung gekommen, weil
-- es die Uebungen damals noch nicht gab. Genau so entsteht diese Fehlerfamilie - und
-- genau deshalb faellt sie jetzt auf, bevor das erste INSERT sie findet: Der Waechter in
-- test_kompass_saetze.py haelt Katalog und Bedingung zusammen.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_123_uebungen.sql

ALTER TABLE selbst_saetze DROP CONSTRAINT IF EXISTS selbst_saetze_herkunft_check;
ALTER TABLE selbst_saetze ADD CONSTRAINT selbst_saetze_herkunft_check
    CHECK (herkunft IN ('selbst', 'szene', 'puls', 'echo', 'uebung'));

COMMENT ON COLUMN selbst_saetze.herkunft IS
    'Woraus der Satz entstanden ist. selbst = getippt, szene/puls = daraus destilliert, '
    'echo = von Echo vorgeschlagen, uebung = Ergebnis einer gefuehrten Uebung.';

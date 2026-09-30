-- zz_141_bild_kontingent.sql
-- Das Kontingent fuer gemalte Bilder.
--
-- 'bild' in die Pruefbedingung von ai_usage_log.kind.
--
-- Ohne sie kaeme die Anfrage durch, das Bildmodell malte, und ERST das Verbuchen braeche ab -
-- ein "Datenbankfehler" nach langer Wartezeit, und das Bild waere schon bezahlt. Dieselbe
-- unangenehme Reihenfolge wie beim Berichtstyp 'partner' (zz_116), beim Freigabe-Element und
-- bei der Podcast-Art (zz_137).
--
-- GEZAEHLT WIRD IN STUECK, NICHT IN MINUTEN
-- Anders als beim Podcast: Dort macht die Laenge den Preis, hier ist die Groesse fest. Ein
-- Bild ist ein Bild. Die Spalte `menge` aus zz_137 traegt hier also immer 1 - und die Summe
-- ueber sie ergibt dieselbe Zahl wie eine Zaehlung.
--
-- DER GERECHNETE WEG BRAUCHT KEINEN EINTRAG
-- Er kostet nichts: kein Modellaufruf, keine Wartezeit, kein Kontingent. Nur die gemalten
-- Bilder werden gezaehlt.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_141_bild_kontingent.sql

ALTER TABLE ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_kind_check;

ALTER TABLE ai_usage_log
    ADD CONSTRAINT ai_usage_log_kind_check
    CHECK (kind IN (
        'report', 'scale_calc', 'fall_faq', 'satz_vorschlag', 'selbstportrait',
        'podcast',
        -- Neu: gemalte Lagebilder, gezaehlt in Stueck.
        'bild'
    ));

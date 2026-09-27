-- zz_137_podcast_kontingent.sql
-- Das Kontingent fuer Podcasts - und eine Menge je Eintrag.
--
-- ZWEI AENDERUNGEN, UND DIE ZWEITE IST DIE INTERESSANTE
--
-- 1. 'podcast' in die Pruefbedingung von ai_usage_log.kind.
--
--    Ohne sie kaeme die Anfrage durch, das Modell schriebe das Skript, die Sprachausgabe
--    liefe eine Minute - und ERST das Verbuchen braeche ab. Dieselbe unangenehme
--    Reihenfolge wie beim Berichtstyp 'partner' (zz_116) und beim Freigabe-Element: Was
--    ankommt, ist ein "Datenbankfehler" nach langer Wartezeit, und die teure Arbeit ist
--    schon getan.
--
-- 2. Eine Spalte `menge`.
--
--    Bisher zaehlt das Kontingent ZEILEN: ein Bericht, ein Eintrag, eins von zehn. Fuer
--    Podcasts geht das nicht auf. Eine Folge zu zaehlen belohnt die lange und bestraft die
--    kurze - und wer drei kurze machen wollte, macht dann drei lange, weil sie gleich viel
--    kosten. Gezaehlt werden deshalb MINUTEN.
--
--    `menge` traegt sie. Fuer alles Bestehende steht sie auf 1, und die Zaehlung ueber
--    SUM(menge) ergibt dort dieselbe Zahl wie COUNT(*) vorher - die alten Kontingente
--    aendern sich also nicht, weder in der Sperre noch in der Anzeige.
--
--    NOT NULL mit Vorgabe 1: Ein Eintrag ohne Menge waere in einer Summe eine Null, und
--    ein Kontingent, das sich still nicht verbraucht, faellt niemandem auf.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_137_podcast_kontingent.sql

ALTER TABLE ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_kind_check;

ALTER TABLE ai_usage_log
    ADD CONSTRAINT ai_usage_log_kind_check
    CHECK (kind IN (
        'report', 'scale_calc', 'fall_faq', 'satz_vorschlag', 'selbstportrait',
        -- Neu: gezaehlt in Minuten gesprochener Audiodaten, nicht in Folgen.
        'podcast'
    ));

ALTER TABLE ai_usage_log
    ADD COLUMN IF NOT EXISTS menge INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN ai_usage_log.menge IS
    'Wie viel dieser Eintrag verbraucht. 1 fuer alles, was in Stueck zaehlt; '
    'bei podcast die angefangenen Minuten. Gezaehlt wird ueber SUM(menge).';

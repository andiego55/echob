-- Migration 104: Die Fall-FAQ zaehlt gegen das monatliche KI-Kontingent.
--
-- WARUM
-- Ein Fall-FAQ-Lauf schickt den vollen Fallkontext zehnmal an das Modell - einmal je
-- Kategorie, einmal fuer das Merkmalsbild. Bei einem Fall mittlerer Groesse sind das rund
-- 73.000 Eingabe-Token, am Szenen-Deckel ueber 370.000. Ein Lauf kostet damit ungefaehr so
-- viel wie zehn Fachpersonen-Berichte. Ohne Grenze koennte jemand die Freigabe fuenfzigmal
-- speichern und fuenfzigmal ausloesen.
--
-- WARUM HIER UND NICHT IN EINER EIGENEN TABELLE
-- Fuer Berichte und Skalen gibt es das Kontingent schon: monatlich, je Nutzer:in, gezaehlt
-- im loeschfesten ai_usage_log. Eine zweite Zaehlung daneben haette dieselbe Aufgabe mit
-- anderen Regeln geloest - und die Einstellungsseite zeigte dann zwei Sorten Kontingent,
-- von denen nur eine wie die andere funktioniert.
--
-- Die CHECK-Bedingung auf `kind` musste dafuer erweitert werden. Das ist der Grund, warum
-- diese Migration ueberhaupt existiert: Ohne sie wuerde jeder INSERT mit 'fall_faq'
-- abgewiesen, und zwar erst zur Laufzeit.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_104_fall_faq_kontingent.sql

ALTER TABLE ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_kind_check;

ALTER TABLE ai_usage_log
    ADD CONSTRAINT ai_usage_log_kind_check
    CHECK (kind IN ('report', 'scale_calc', 'fall_faq'));

COMMENT ON COLUMN ai_usage_log.kind IS
    'Art der KI-Aktion. Werte und Kontingente in app/services/subscription_service.py (_AI_USAGE_LIMITS).';

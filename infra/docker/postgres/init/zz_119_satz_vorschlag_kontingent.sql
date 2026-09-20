-- zz_119_satz_vorschlag_kontingent.sql
-- Echo schlaegt Saetze vor: eine neue Art im Kontingent.
--
-- WARUM DAS EIN KONTINGENT BRAUCHT
-- Ein Lauf schickt die letzten Szenen und Pulse einer Person an das Modell. Das ist nicht
-- so teuer wie ein Bericht, aber es ist ein Knopf, den man aus Neugier druecken kann -
-- und ohne Grenze auch fuenfzigmal am Tag. Gezaehlt wird ueber dasselbe loeschfeste
-- ai_usage_log wie Berichte, Skalen und Fall-FAQ: je Person, je Kalendermonat.
--
-- WARUM DIE BEDINGUNG NEU GESETZT WIRD
-- kind traegt eine CHECK-Bedingung. Ein neues Wort NUR in _AI_USAGE_LIMITS einzutragen
-- reicht nicht: Der Zaehler faellt dann erst beim INSERT - also NACH dem Modellaufruf,
-- wenn die Arbeit schon bezahlt ist. Dieselbe Reihenfolge wie bei den Berichtsarten.
-- Ein Waechter (test_kontingent_arten.py) haelt Code und Bedingung ab jetzt zusammen.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_119_satz_vorschlag_kontingent.sql

ALTER TABLE ai_usage_log DROP CONSTRAINT IF EXISTS ai_usage_log_kind_check;

ALTER TABLE ai_usage_log
    ADD CONSTRAINT ai_usage_log_kind_check
    CHECK (kind IN ('report', 'scale_calc', 'fall_faq', 'satz_vorschlag'));

COMMENT ON COLUMN ai_usage_log.kind IS
    'Art der KI-Aktion. Werte und Kontingente in app/services/subscription_service.py (_AI_USAGE_LIMITS).';

-- ── Der Grund eines Vorschlags ──────────────────────────────────────────────
-- Zu jedem vorgeschlagenen Satz gehoert, WORAN im Material Echo ihn festmacht: "Das kam
-- in drei Situationen vor, in denen jemand lauter wurde."
--
-- Warum das gespeichert wird und nicht nur einmal ueber den Bildschirm laeuft: Ein
-- Vorschlag ueber die eigene Person will nicht weggeklickt, sondern ueberlegt werden.
-- Wer am naechsten Tag wiederkommt, muss den Grund noch lesen koennen - sonst steht da
-- eine Behauptung ohne Beleg, und Zustimmen wird zum Raten.
--
-- Feldverschluesselt wie der Satz selbst.
ALTER TABLE selbst_saetze ADD COLUMN IF NOT EXISTS grund TEXT;

COMMENT ON COLUMN selbst_saetze.grund IS
    'Woran Echo den Vorschlag festmacht. Nur bei herkunft <> selbst gesetzt. Verschluesselt.';

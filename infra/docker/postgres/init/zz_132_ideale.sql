-- zz_132_ideale.sql
-- Meine Traumbeziehung: die Skizze einer gewuenschten Beziehung, je Beziehungsart eine.
--
-- WARUM EINE EIGENE TABELLE
-- Die Regel des Kompass lautet: Kein WERKZEUG bekommt eine eigene Tabelle, nur eine
-- GRUNDFORM. Ein Ideal ist kein Werkzeug - es ist etwas, das man macht und behaelt, wie
-- ein Selbstportraet (selbst_portraits) oder ein Brief an das eigene Ich (selbst_briefe).
-- Beide haben aus demselben Grund eine eigene Tabelle bekommen.
--
-- Der Krisenplan ist das Gegenbeispiel und zeigt die Grenze: Er liegt als art='krisenplan'
-- IN selbst_vorhaben, weil er dieselbe Gestalt hat wie ein Vorhaben (Titel, Inhalt, Stand).
-- Ein Ideal hat die nicht: Es hat keinen Stand, keine Schritte, keine Rueckschau. Es
-- hineinzuzwaengen waere eine falsche Ersparnis.
--
-- EINE ZEILE JE BEZIEHUNGSART
-- Wie beim Krisenplan (einer je Person), nur eine Ebene feiner: eine je Person UND Art.
-- Wer sich eine Partnerschaft und eine Familie wuenscht, wuenscht sich zweierlei - aber
-- zwei Partnerschafts-Ideale nebeneinander waeren keine Praezision, sondern Unschluessig-
-- keit. Und der Vergleich mit einem Fall waere nicht mehr eindeutig: Gegen welches?
--
-- DIE ART IST NICHT DEKORATION
-- Sie traegt dieselben Schluessel wie cases.relationship_type (02_app.sql) - genau daran
-- haengt die Bedingung fuer den Vergleich: Ein Partnerschafts-Ideal laesst sich nur mit
-- einem Partnerschafts-Fall vergleichen. Diese Pruefung kann es nur geben, wenn beide
-- Seiten dieselben Woerter benutzen.
--
-- Bewusst NICHT dabei: 'own_patterns' (eine Beziehung zu sich selbst hat kein Gegenueber,
-- das man sich wuenschen koennte), 'ex_partner' (ein Ideal fuer eine beendete Beziehung
-- waere kein Entwurf, sondern eine Abrechnung) und 'other' (der Katalog wuesste nicht,
-- welche Aspekte er anbieten soll).
--
-- WAS IM INHALT STEHT
--   aspekte       [{key, gewicht}]   was zaehlt, und wie viel davon (0..100)
--   reihung       [key, ...]         die wichtigsten in einer Ordnung, hoechstens fuenf
--   abwaegungen   {key: 0..100}      die Gegensatzpaare, 50 = beides gleich
--   eigenes       Text               der Satz, der schwerer wiegt als alles Angetippte
--
-- Freitext wird feldverschluesselt abgelegt (crypto.encrypt_json_strings), wie beim
-- Krisenplan. Hier steht, was ein Mensch sich wuenscht - das ist nicht weniger heikel als
-- das, was er erlebt hat.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_132_ideale.sql

CREATE TABLE IF NOT EXISTS selbst_ideale (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    art         TEXT NOT NULL CHECK (art IN (
                    'partner', 'family', 'child', 'friendship', 'work', 'co_parenting'
                )),
    inhalt      JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Wann die Skizze zuletzt angesehen UND bestaetigt wurde. Ein Ideal veraltet leise:
    -- Was man sich mit dreissig wuenscht, ist mit vierzig ein anderer Satz. Die Spalte
    -- traegt spaeter die Frage „stimmt das noch?" - wie bei den Saetzen ueber mich.
    geprueft_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Eine je Person und Art. Ohne diesen Index entstehen beim zweiten Speichern still zwei
-- Zeilen, und beim naechsten Aufruf weiss niemand, welche gemeint ist.
CREATE UNIQUE INDEX IF NOT EXISTS selbst_ideale_person_art_idx
    ON selbst_ideale (user_id, art);

-- Der Einstieg ist immer „alle meine Ideale" - die Liste im Raum.
CREATE INDEX IF NOT EXISTS selbst_ideale_user_idx
    ON selbst_ideale (user_id, updated_at DESC);

COMMENT ON TABLE selbst_ideale IS
    'Meine Traumbeziehung: eine Skizze je Beziehungsart. Grundform des Kompass, kein '
    'Werkzeug. art traegt dieselben Schluessel wie cases.relationship_type - daran haengt '
    'die Bedingung fuer den Vergleich mit einem Fall.';

COMMENT ON COLUMN selbst_ideale.inhalt IS
    'aspekte [{key,gewicht}], reihung [key], abwaegungen {key:0..100}, eigenes (Text). '
    'Freitext feldverschluesselt. Die Schluessel stehen in '
    'app/services/kompass_ideal_katalog.py.';

-- zz_115_loeschprotokoll.sql
-- Ein Protokoll ueber geloeschte Konten - und zwar genau so wenig, wie noetig ist.
--
-- WARUM ES DAS GEBEN MUSS
-- Eine Loeschung nach Art. 17 DSGVO ist die einzige Aenderung, die sich hinterher nicht
-- mehr belegen laesst: Danach ist nichts mehr da, was zeigen wuerde, dass jemand da war.
-- Wenn spaeter jemand fragt "haben Sie meine Daten geloescht?", gibt es ohne dieses
-- Protokoll keine Antwort ausser "vermutlich ja". Die Rechenschaftspflicht (Art. 5 Abs. 2)
-- verlangt aber, dass wir es zeigen koennen.
--
-- WARUM ES TROTZDEM KEIN HINTERTUERCHEN IST
-- Hier steht die Kennung und sonst nichts von der Person: kein Name, keine Adresse, kein
-- Pseudonym, keine Zahl, aus der sich etwas ueber sie schliessen liesse. Eine UUID, zu der
-- es in keiner Tabelle mehr eine Zeile gibt, benennt niemanden - sie belegt nur, dass zu
-- dieser Kennung am Tag X nichts mehr da war. Genau das ist der Zweck.
--
-- Der Zeilenzaehler ist bewusst eine einzige Summe und keine Aufschluesselung je Tabelle:
-- "47 Zeilen" ist ein Beleg, "3 Faelle, 41 Szenen, 2 Berichte" waere schon wieder ein
-- Datensatz ueber einen Menschen.
--
-- Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_115_loeschprotokoll.sql

CREATE TABLE IF NOT EXISTS admin_kontoloeschungen (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Die geloeschte Kennung. Nach der Loeschung zeigt sie ins Leere - das ist der Punkt.
    user_id        UUID        NOT NULL,
    -- In welchen Rollen dieses Konto gefuehrt wurde (client/professional/institute/
    -- student). Ohne das laesst sich hinterher nicht einmal sagen, was fuer ein Konto es
    -- war - und das braucht man, wenn eine Fachperson nach ihren Unterlagen fragt.
    rollen         TEXT[]      NOT NULL DEFAULT '{}',
    zeilen         INTEGER     NOT NULL DEFAULT 0,
    -- 'geloescht' | 'war_bereits_weg' | 'fehlgeschlagen' - der Zustand des Login-Kontos
    -- bei Supabase. 'war_bereits_weg' ist der haeufige Fall beim Aufraeumen von
    -- Karteileichen: im Dashboard geloescht, in dieser Datenbank stehen geblieben.
    auth_konto     TEXT        NOT NULL,
    geloescht_von  UUID        NOT NULL,
    geloescht_am   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT admin_kontoloeschungen_auth_chk
        CHECK (auth_konto IN ('geloescht', 'war_bereits_weg', 'fehlgeschlagen'))
);

CREATE INDEX IF NOT EXISTS idx_admin_kontoloeschungen_am
    ON admin_kontoloeschungen (geloescht_am DESC);

COMMENT ON TABLE admin_kontoloeschungen IS
    'Beleg ueber geloeschte Konten (Art. 5 Abs. 2 DSGVO): Kennung, Rollen, Zeilensumme, '
    'Zeitpunkt. Enthaelt bewusst keinen Namen, keine Adresse und keine Aufschluesselung.';

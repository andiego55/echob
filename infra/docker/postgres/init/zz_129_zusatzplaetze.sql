-- zz_129_zusatzplaetze.sql
-- Zusaetzliche Fall-Plaetze fuer eine Organisation, unabhaengig vom Tarif.
--
-- WOFUER
-- Am Anfang wird man Fachpersonen etwas schenken muessen: mehr Faelle, als ihr Tarif
-- hergibt. Bisher ging das nur, indem man ihren Tarif hochstuft - dann zahlen sie mehr,
-- oder es stimmt die Rechnung nicht. Beides ist falsch.
--
-- WARUM ADDITIV UND NICHT UEBERSCHREIBEND
-- Der naheliegende Weg waere eine Spalte "included_cases_override". Sie ist eine Falle:
-- Wer heute auf Solo (1 Platz) sitzt und 4 geschenkt bekommt, haette dort "5" stehen.
-- Wechselt die Person spaeter auf Praxis (5 Plaetze), wuerde der Override sie bei 5
-- festhalten - und beim Wechsel auf Institut (10) saehen sie stillschweigend WENIGER,
-- als ihr Tarif hergibt. Ein Geschenk, das beim Upgrade zur Bremse wird.
--
-- Additiv heisst: Der Tarif bleibt der Tarif, und das Geschenk kommt obendrauf. Es
-- ueberlebt jeden Tarifwechsel, und was es ist, bleibt erkennbar.
--
-- WARUM GRUND UND DATUM DAZUGEHOEREN
-- Ein Geschenk, das in einem halben Jahr niemand mehr erklaeren kann, wird zum
-- Support-Fall: "Warum hat die 9 Plaetze?" Und es wird nie zurueckgenommen, weil sich
-- niemand traut. Der Grund steht deshalb daneben, und wer es gesetzt hat auch.
--
-- WAS DAS NICHT IST: ein individueller Tarif. Der Preis bleibt der des Tarifs; was hier
-- steht, sind nur Plaetze. Fuer abweichende Preise gibt es Stripe-Gutscheine - eine
-- eigene Tariftabelle waere eine zweite Preisliste neben der von Stripe, und zwei
-- Preislisten widersprechen sich irgendwann.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_129_zusatzplaetze.sql

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS zusatz_faelle INTEGER NOT NULL DEFAULT 0;

-- Keine negativen Geschenke: Plaetze wegzunehmen, die der Tarif enthaelt, gehoert nicht
-- hierher - das waere eine Tarifaenderung mit anderem Namen.
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_zusatz_faelle_check;
ALTER TABLE organizations
    ADD CONSTRAINT organizations_zusatz_faelle_check
    CHECK (zusatz_faelle >= 0 AND zusatz_faelle <= 500);

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS zusatz_grund TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS zusatz_gesetzt_am TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS zusatz_gesetzt_von UUID;

COMMENT ON COLUMN organizations.zusatz_faelle IS
    'Zusaetzliche Fall-Plaetze OBENDRAUF auf den Tarif (nicht statt seiner). Ueberlebt '
    'jeden Tarifwechsel. Gesetzt im Admin, mit Grund.';
COMMENT ON COLUMN organizations.zusatz_grund IS
    'Warum. Ohne diesen Satz ist ein Geschenk in einem halben Jahr nicht mehr erklaerbar '
    'und wird deshalb nie zurueckgenommen.';

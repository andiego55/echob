-- Migration 102: Einwilligungs-Wortlaut beweissicher + Berufsgruppe der Fachperson.
--
-- ZWEI GETRENNTE ANLIEGEN, EINE DATEI, weil beide aus derselben Compliance-Durchsicht
-- vom 2026-09-07 stammen und beide additiv sind.
--
-- 1) case_shares.consent_text
--    Bisher wurde zur Einwilligung nur festgehalten, DASS sie erteilt wurde
--    (consent), WANN (created_at) und in welcher FASSUNG (consent_version). Der
--    Wortlaut selbst stand nirgends. Wer in zwei Jahren belegen muss, WOZU eine
--    Person eingewilligt hat, muesste den damaligen Quellcode-Stand rekonstruieren
--    und darauf vertrauen, dass die Fassungskennung damals korrekt hochgezaehlt
--    wurde. Eine Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO muss aber
--    nachweisbar informiert und bestimmt gewesen sein - und das ist eine Aussage
--    ueber den Text, nicht ueber eine Kennung.
--
--    Gespeichert wird der Text, der der Person TATSAECHLICH ANGEZEIGT wurde,
--    einschliesslich des eingesetzten Namens der Fachperson. Im Klartext: Er ist
--    der Nachweis und muss lesbar bleiben; personenbezogen ist daran nur der Name
--    der Fachperson, der ohnehin in derselben Zeile steht.
--
-- 2) professional_profiles.profession_group
--    Ob eine Fachperson der strafbewehrten Schweigepflicht nach § 203 StGB
--    unterliegt, haengt an ihrer Berufsgruppe - und daran haengen unterschiedliche
--    Pflichten. Psychotherapeut:innen und Berufspsycholog:innen fallen darunter,
--    Coaches und Berater:innen nicht, bei Heilpraktiker:innen fuer Psychotherapie
--    ist es ueberwiegend verneint (keine staatlich geregelte Ausbildung).
--
--    Bisher gab es nur `title` als Freitext ("Psychologische Beratung"), aus dem
--    sich nichts ableiten laesst. Die Zuordnung ist bewusst NULLABLE: Bestandskonten
--    haben sie nicht, und eine erfundene Voreinstellung waere schlimmer als eine
--    fehlende Angabe. Die Werte pflegt `app/core/berufsgruppen.py` - hier steht
--    absichtlich KEIN CHECK-Constraint, damit eine neue Gruppe nicht an drei
--    Stellen gleichzeitig nachgezogen werden muss.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_102_einwilligung_und_berufsgruppe.sql

ALTER TABLE case_shares
    ADD COLUMN IF NOT EXISTS consent_text TEXT;

COMMENT ON COLUMN case_shares.consent_text IS
    'Wortlaut der Einwilligung, wie er der Person angezeigt wurde (Nachweis nach Art. 7 Abs. 1 DSGVO). NULL bei Freigaben von vor Migration 102.';

ALTER TABLE professional_profiles
    ADD COLUMN IF NOT EXISTS profession_group TEXT;

COMMENT ON COLUMN professional_profiles.profession_group IS
    'Berufsgruppe der Fachperson; entscheidet ueber die Anwendbarkeit von § 203 StGB. Werte in app/core/berufsgruppen.py. NULL = noch nicht angegeben.';

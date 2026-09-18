-- zz_112_ki_hinweis.sql
-- Der Hinweis zur Schweigepflicht, den eine Fachperson einmal bestaetigt, bevor sie
-- Fallinhalte an die KI schickt.
--
-- WARUM
-- Mit jeder Echo-Frage und jedem Bericht geht der freigegebene Fall an den
-- KI-Dienstleister - und zusaetzlich die eigenen Aufzeichnungen der Fachperson:
-- Arbeitsmappe, Sitzungsnotizen, Erkenntnisse, Zuweisungen. Fuer die freigegebenen
-- Inhalte hat die Klient:in bei der Freigabe ausdruecklich von der Schweigepflicht
-- entbunden (case_shares.consent_text, Migration 102). Fuer die Sitzungsnotizen der
-- Fachperson hat das niemand - sie sind ihre eigene Behandlungsdokumentation.
--
-- Wer unter § 203 StGB faellt, muss das wissen, BEVOR es zum ersten Mal passiert. Der
-- Hinweis sperrt nichts dauerhaft: einmal lesen, bestaetigen, fertig.
--
-- WARUM KEINE NEUE TABELLE
-- professional_agreements protokolliert bereits append-only, wer welcher Fassung wann
-- zugestimmt hat, mit User-Agent und IP als Beleg. Genau das wird hier gebraucht. Der
-- CHECK liess bisher nur 'avv' zu.
--
-- WARUM NICHT DERSELBE HAKEN WIE DER AVV
-- Der AVV ist ein Vertrag ueber die Auftragsverarbeitung, den die Fachperson abschliesst.
-- Dies hier ist eine Information, die sie zur Kenntnis nimmt. Zwei verschiedene Dinge,
-- zwei Fassungen, zwei Nachweise - und der eine darf nicht den anderen miterledigen.
--
-- Additiv, idempotent. Ohne Migration liefe der Hinweis in eine CHECK-Verletzung und
-- keine Fachperson koennte ihn bestaetigen.
--
-- Prod (VOR dem API-Rebuild):
--   docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_112_ki_hinweis.sql

ALTER TABLE professional_agreements
    DROP CONSTRAINT IF EXISTS professional_agreements_kind_check;

ALTER TABLE professional_agreements
    ADD CONSTRAINT professional_agreements_kind_check
    CHECK (kind IN ('avv', 'schweigepflicht'));

COMMENT ON COLUMN professional_agreements.kind IS
    'avv = Auftragsverarbeitungsvertrag (Art. 28 DSGVO, schaltet echte Faelle frei). ki_hinweis = Kenntnisnahme des Hinweises zur Schweigepflicht (§ 203 StGB, schaltet die KI-Aufrufe mit Fallkontext frei).';

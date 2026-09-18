-- zz_113_notizen_einwilligung.sql
-- Die zweite freiwillige Entscheidung im Freigabe-Dialog: Duerfen auch die eigenen
-- Aufzeichnungen der Fachperson durch die KI verarbeitet werden?
--
-- WARUM DAS NOETIG IST
-- Die Entbindung von der Schweigepflicht, die eine Klient:in beim Freigeben erteilt, gilt
-- woertlich "nur fuer die von mir ausgewaehlten Inhalte" (siehe lib/einwilligung.ts). Die
-- Arbeitsmappe, die Sitzungsnotizen, die festgehaltenen Erkenntnisse und die gespeicherten
-- Zusammenfassungen der Fachperson hat sie nie ausgewaehlt - sie kennt sie nicht einmal.
-- Sie gingen aber bisher bei jeder Echo-Frage und jedem Bericht mit.
--
-- WARUM EIN EIGENES HAEKCHEN UND NICHT IM PFLICHTTEXT
-- Art. 7 Abs. 4 DSGVO und Erwaegungsgrund 43: Wer zu verschiedenen Verarbeitungen nicht
-- getrennt zustimmen kann, hat nicht freiwillig zugestimmt. Genau deshalb wurde die
-- Einwilligung im September 2026 schon einmal in zwei Erklaerungen geteilt. Dieses Feld
-- gehoert zu einer DRITTEN, freiwilligen Erklaerung - ohne sie ist die Freigabe trotzdem
-- moeglich, die Werkzeuge arbeiten dann ohne die Aufzeichnungen der Fachperson.
--
-- DEFAULT FALSE, UND DAS IST DIE AUSSAGE
-- Bestandsfreigaben haben diese Einwilligung nicht eingeholt. Sie auf true zu setzen, hiesse
-- eine Zustimmung zu behaupten, die niemand gegeben hat. Fuer bestehende Faelle bleiben die
-- Aufzeichnungen der Fachperson also draussen, bis die Klient:in die Freigabe einmal neu
-- speichert - sichtbar gemacht im Fachpersonenbereich.
--
-- Additiv, idempotent.
--
-- Prod (VOR dem API-Rebuild):
--   docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_113_notizen_einwilligung.sql

ALTER TABLE case_shares
    ADD COLUMN IF NOT EXISTS notizen_erlaubt BOOLEAN NOT NULL DEFAULT FALSE;

-- Ausnahme Spielwiese: Dort gibt es keinen Menschen, dessen Aufzeichnungen geschuetzt
-- werden muessten - die Klientin ist erfunden, die Notizen der Fachperson gehoeren zum
-- Beispielmaterial. Ohne diese Zeile zeigte der Beispielfall weniger als das Produkt kann,
-- und zwar ohne erkennbaren Grund. demo_service legt neue Demo-Freigaben gleich so an.
UPDATE case_shares SET notizen_erlaubt = true WHERE is_demo AND NOT notizen_erlaubt;

COMMENT ON COLUMN case_shares.notizen_erlaubt IS
    'Freiwillige Einwilligung der Klient:in: Auch die eigenen Aufzeichnungen der Fachperson (Arbeitsmappe, Sitzungsnotizen, Erkenntnisse, Zusammenfassungen) duerfen fuer die KI-Funktionen verarbeitet werden. Der Wortlaut, dem sie zugestimmt hat, steht in consent_text.';

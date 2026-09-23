-- zz_125_satz_pruefung.sql
-- "Stimmt das noch?" - der Raum legt alte Saetze von sich aus wieder vor.
--
-- WARUM
-- Ein Selbstbild, das nur waechst, ist ein Archiv. Der Bauplan sagt es so:
--
--   Vor acht Monaten hast du gesagt: "Wenn ich Nein sage, verliere ich Menschen."
--   Stimmt das noch?
--
-- Drei Knoepfe: stimmt - hat sich veraendert - stimmt nicht mehr. Aus "hat sich
-- veraendert" entsteht ein NEUER Satz neben dem alten, und genau dieses Nebeneinander
-- ist laut Bauplan "die schoenste Entwicklungsanzeige, die das Produkt hat".
--
-- Das ist zugleich die Antwort auf eine Festlegung: Wir haben Benachrichtigungen
-- ausgeschlossen. Dann muss der Grund zurueckzukommen im Raum selbst liegen - "der Raum
-- soll etwas FUER dich haben, nicht etwas VON dir wollen".
--
-- WARUM EINE EIGENE SPALTE UND NICHT bestaetigt_at
-- Naheliegend waere, bei "stimmt" einfach bestaetigt_at neu zu setzen. Das waere falsch:
-- Neben jedem Satz steht sein Alter ("bestaetigt vor acht Monaten"), und das ist keine
-- Verzierung - es sagt, dass ein Satz eine Einschaetzung von einem Tag ist und kein
-- Befund. Wer bestaetigt_at beim Nachfragen hochzaehlt, macht aus jedem alten Satz einen
-- frischen und loescht genau die Auskunft, um die es hier geht.
--
-- geprueft_at beantwortet eine andere Frage: WANN wurde zuletzt nachgefragt. Nur dafuer
-- ist sie da - damit derselbe Satz nicht jede Woche wieder vorgelegt wird.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_125_satz_pruefung.sql

ALTER TABLE selbst_saetze ADD COLUMN IF NOT EXISTS geprueft_at TIMESTAMPTZ;

COMMENT ON COLUMN selbst_saetze.geprueft_at IS
    'Wann zuletzt "Stimmt das noch?" beantwortet wurde. NICHT bestaetigt_at anfassen: '
    'Das Alter eines Satzes ist die Auskunft, dass er eine Einschaetzung von einem Tag '
    'ist und kein Befund.';

-- Die Abfrage sucht den AELTESTEN bestaetigten Satz, der lange nicht geprueft wurde.
-- Ohne diesen Index liest sie bei jemandem mit vierzig Saetzen die ganze Liste - was
-- egal waere, wenn sie nicht auf jeder Seite der Saetze liefe.
CREATE INDEX IF NOT EXISTS idx_selbst_saetze_pruefung
    ON selbst_saetze (user_id, bestaetigt_at)
    WHERE stand = 'bestaetigt';

-- ── Der neue Satz kennt seinen Vorgaenger ───────────────────────────────────
-- Aus "hat sich veraendert" waechst ein neuer Satz. Ohne diesen Verweis staenden danach
-- zwei Saetze nebeneinander, und niemand saehe, dass der eine aus dem anderen geworden
-- ist - es waeren zwei Meinungen statt einer Entwicklung.
--
-- ON DELETE SET NULL: Wer den alten Satz wegnimmt, soll nicht den neuen mitverlieren.
-- Der neue ist eine eigene Aussage und ueberlebt seine Herkunft - dieselbe Entscheidung
-- wie bei szene_id.
ALTER TABLE selbst_saetze
    ADD COLUMN IF NOT EXISTS vorgaenger_id UUID
    REFERENCES selbst_saetze (id) ON DELETE SET NULL;

COMMENT ON COLUMN selbst_saetze.vorgaenger_id IS
    'Der Satz, aus dem dieser geworden ist ("hat sich veraendert"). Das Nebeneinander '
    'von altem und neuem Satz ist die eigentliche Entwicklungsanzeige.';

CREATE INDEX IF NOT EXISTS idx_selbst_saetze_vorgaenger
    ON selbst_saetze (vorgaenger_id) WHERE vorgaenger_id IS NOT NULL;

-- 94_couple_honest.sql
-- Paartherapie: "Ehrliches Mitteilen" - eine Runde, in der niemand antwortet.
--
-- WARUM ES DAS BRAUCHT. Jede andere Station im Paarraum laesst Echo dazwischentreten:
-- Echo moderiert die Sitzung, erarbeitet die Mediation, formuliert um, fasst zusammen.
-- Das ist gut, solange es zu heiss ist, um direkt zu reden - aber es ist eine Kruecke.
-- Wer sie nie ablegt, lernt nie wieder, ohne sie zu gehen.
--
-- Hier tritt Echo bewusst zurueck. Es haelt den Rahmen (wer ist dran, wann ist die Runde
-- zu Ende) und ruehrt den Inhalt nicht an. Keine Deutung, keine Zusammenfassung, keine
-- Umformulierung.
--
-- DIE EINE REGEL, DIE ALLES TRAEGT: Wer zuhoert, antwortet nicht. In einem Kreis muss
-- das eine Moderatorin durchsetzen. Hier gibt es schlicht kein Eingabefeld, solange du
-- zuhoerst - das ist die einzige Stelle, an der Software das besser kann als ein Mensch.
--
-- BEWUSSTE ENTSCHEIDUNGEN:
--
--   * Strikt abwechselnd. Wer zuletzt mitgeteilt hat, ist erst wieder dran, wenn die
--     andere Person mitgeteilt hat - und mitteilen darf nur, wer den letzten Beitrag der
--     anderen als gehoert markiert hat. Ohne diese zwei Regeln wird es ein Chat.
--   * Das Ankommen ist blind (beide sehen es erst, wenn beide da sind), die Beitraege
--     sind es NICHT. In einem Kreis hoert man einander; sequenziell ist hier richtig.
--   * KEIN Abschluss-Ergebnis. Keine Zusammenfassung, keine Abmachung, keine Bitte, kein
--     Weiterfuehren-Block. Ueberall sonst im Paarraum habe ich Ausgaenge eingebaut, damit
--     nichts blind endet - hier waere ein Ausgang der Fehler. Die Runde endet mit "Es
--     steht." Genau das unterscheidet die Methode von GFK und von der Mediation.
--   * `metadata` traegt die Sicherheits-Markierung. Weil Echo den Text nicht liest, laeuft
--     die Krisen-Triage sonst gar nicht - ausgerechnet bei dem Feature, das die
--     verletzlichsten Saetze hervorlockt. Sie laeuft, aber das Ergebnis sieht NUR die
--     schreibende Person. Ein Urteil ueber die andere waere hier ein Uebergriff.
--   * Alle Freitexte verschluesselt (Fernet, wie ueberall im Paarraum).
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS couple_honest_rounds (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id   UUID NOT NULL REFERENCES couple_links (id) ON DELETE CASCADE,
    -- arriving = beide muessen erst ankommen · open = der Kreis laeuft · closed = es steht
    status      TEXT NOT NULL DEFAULT 'arriving'
                CHECK (status IN ('arriving', 'open', 'closed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    opened_at   TIMESTAMPTZ,
    closed_at   TIMESTAMPTZ,
    closed_by   UUID
);

-- Hoechstens EINE offene Runde je Paarraum. Zwei parallele Kreise waeren kein Kreis mehr.
CREATE UNIQUE INDEX IF NOT EXISTS idx_couple_honest_one_open
    ON couple_honest_rounds (couple_id)
    WHERE status <> 'closed';

-- Das Ankommen: genau ein Satz je Person und Runde, blind bis beide da sind.
CREATE TABLE IF NOT EXISTS couple_honest_arrivals (
    round_id    UUID NOT NULL REFERENCES couple_honest_rounds (id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    body        TEXT NOT NULL,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (round_id, user_id)
);

CREATE TABLE IF NOT EXISTS couple_honest_shares (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id    UUID NOT NULL REFERENCES couple_honest_rounds (id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    -- Schluessel des gewaehlten Impulses ("gefuehl", "gedanke", …) oder NULL bei freiem
    -- Text. Der Katalog steht im Code: redaktionelle Texte, keine Nutzerdaten.
    impulse     TEXT,
    body        TEXT NOT NULL,
    -- Wann die ANDERE Person markiert hat, dass sie es gehoert hat. Der Raum hat genau
    -- zwei Mitglieder, eine eigene Empfaengerspalte waere eine zweite Wahrheit.
    heard_at    TIMESTAMPTZ,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_couple_honest_shares_round
    ON couple_honest_shares (round_id, created_at);

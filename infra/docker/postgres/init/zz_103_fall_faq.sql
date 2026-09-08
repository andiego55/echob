-- Migration 103: Fall-FAQ — das Fragenpaket, das die Klient:in auslöst.
--
-- WAS DAS IST
-- Beim Freigeben kann eine Klient:in ein Häkchen setzen. Dann stellt EchoB vierzig
-- fachlich vorbereitete Fragen an das Sprachmodell — ausschliesslich auf dem Material,
-- das sie ohnehin freigegeben hat — und legt die Antworten fuer die Fachperson ab.
--
-- WARUM DIE KLIENT:IN AUSLOEST UND NICHT DIE FACHPERSON
-- Fuer Berufsgeheimnistraeger:innen (§ 203 StGB) ist die Frage, WER offenbart, nicht
-- akademisch. Stellt die Fachperson selbst Fragen an ein KI-System, offenbart sie. Loest
-- die Klient:in die Uebermittlung aus, offenbart sie ueber sich selbst — und die
-- Fachperson liest nur, was ihr uebermittelt wurde. Deshalb haengt der Ausloeser an der
-- Freigabe (case_shares.faq_enabled) und nicht an einem Knopf im Fachpersonenbereich.
--
-- Genau deshalb steht der Fragenkatalog auch fest im Code (app/services/fall_faq_katalog.py)
-- und ist nicht editierbar: Duerfte die Fachperson die Fragen formulieren, koennte eine
-- Frage selbst Klienteninhalte tragen — und dann offenbarte sie doch wieder.
--
-- DIE ANTWORTEN GEHOEREN AN DIE FREIGABE, NICHT AN DEN FALL
-- run.share_id mit ON DELETE CASCADE: Verschwindet die Freigabe, verschwinden die
-- Antworten mit ihr. Ein Widerruf setzt case_shares.status auf 'revoked' und loescht
-- nichts — deshalb liegt die eigentliche Absicherung im Lese-Endpunkt, der durch
-- require_active_share geht. Die Kaskade ist die zweite Reihe, nicht die erste.
--
-- WAS VERSCHLUESSELT IST
-- antwort, belege und auswertung enthalten Klienteninhalte im Klartext-Sinn (Zitate aus
-- Szenen) und werden wie ueberall in EchoB mit Fernet verschluesselt abgelegt. Nicht
-- verschluesselt sind Kennungen, Zaehler und Status — daraus laesst sich nichts ueber
-- einen Menschen lesen, und man braucht sie fuer Abfragen.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_103_fall_faq.sql

-- ── 1) Der Ausloeser an der Freigabe ────────────────────────────────────────

ALTER TABLE case_shares
    ADD COLUMN IF NOT EXISTS faq_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN case_shares.faq_enabled IS
    'Die Klient:in hat das Fall-FAQ-Fragenpaket ausgeloest. Der Wortlaut, dem sie dabei zugestimmt hat, steht in consent_text.';


-- ── 2) Ein Lauf ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_faq_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id             UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    share_id            UUID NOT NULL REFERENCES case_shares(id) ON DELETE CASCADE,
    -- Redundant zur Freigabe, aber bewusst: Der Lese-Endpunkt filtert darauf, und ein
    -- Join ueber case_shares waere eine Stelle mehr, an der die Bedingung fehlen kann.
    professional_user_id UUID NOT NULL,
    owner_user_id       UUID NOT NULL,

    -- offen → laeuft → fertig | fehler. 'teilweise' gibt es nicht: Ein Lauf, der die
    -- Haelfte beantwortet hat, ist 'fertig' mit weniger Antworten — die Oberflaeche
    -- zeigt an, was da ist, und sagt, was fehlt.
    status              TEXT NOT NULL DEFAULT 'offen',
    fehler              TEXT,

    -- Womit dieser Lauf erzeugt wurde. Aendert sich der Katalog, bleibt nachvollziehbar,
    -- welche Fragen einer alten Auswertung zugrunde lagen — ohne den damaligen Stand
    -- des Quellcodes zu rekonstruieren.
    katalog_fassung     TEXT NOT NULL,

    fragen_geplant      INTEGER NOT NULL DEFAULT 0,
    fragen_beantwortet  INTEGER NOT NULL DEFAULT 0,

    -- Das Merkmalsbild: Achsenwerte, Cluster-Anteile, Belege und Gegenbelege.
    -- Verschluesselte Zeichenketten in der Struktur (crypto.encrypt_json_strings).
    auswertung          JSONB,

    angefordert_am      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fertig_am           TIMESTAMPTZ
);

-- Ein Lauf je Freigabe. Loest die Klient:in erneut aus, wird derselbe Lauf ersetzt —
-- sonst sammelten sich Staende an, und die Fachperson muesste raten, welcher gilt.
CREATE UNIQUE INDEX IF NOT EXISTS case_faq_runs_share_uniq
    ON case_faq_runs (share_id);

CREATE INDEX IF NOT EXISTS case_faq_runs_pro_case_idx
    ON case_faq_runs (professional_user_id, case_id);


-- ── 3) Die Antworten ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_faq_answers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id        UUID NOT NULL REFERENCES case_faq_runs(id) ON DELETE CASCADE,

    -- Kennung aus dem Katalog. KEIN Fremdschluessel und kein CHECK: Der Katalog lebt im
    -- Code, und eine Frage, die dort verschwindet, soll eine alte Antwort nicht
    -- unlesbar machen.
    frage_id      TEXT NOT NULL,
    kategorie     TEXT NOT NULL,
    position      INTEGER NOT NULL DEFAULT 0,

    antwort       TEXT,                       -- verschluesselt
    belege        JSONB,                      -- [{szene_nr, zitat}] — Zitate verschluesselt
    gegenbelege   JSONB,                      -- dasselbe, andere Richtung

    -- 'gut' | 'duenn' | 'keine'. Steht neben jeder Antwort, damit eine duenne Auskunft
    -- nicht wie ein Befund aussieht.
    materiallage  TEXT NOT NULL DEFAULT 'keine',

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS case_faq_answers_run_frage_uniq
    ON case_faq_answers (run_id, frage_id);

COMMENT ON TABLE case_faq_runs IS
    'Ein Fall-FAQ-Lauf je Freigabe. Von der Klient:in ausgeloest, nur fuer die Fachperson lesbar.';
COMMENT ON TABLE case_faq_answers IS
    'Antworten eines Fall-FAQ-Laufs. antwort und die Zitate in belege/gegenbelege sind verschluesselt.';

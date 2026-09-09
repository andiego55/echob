-- Resonanz: was Menschen an den oeffentlichen Beziehungsszenen wiedererkennen.
--
-- Auf /szenen liegen 178 erfundene Szenen. Wer eine davon wiedererkennt, sagt etwas ueber
-- sich - oft mehr, als er in ein leeres Textfeld schreiben wuerde. Genau das ist der Sinn:
-- Material fuer Menschen, die noch keine eigene Szene aufschreiben koennen.
--
-- ZWEI TABELLEN, ZWEI WELTEN. Das ist Absicht und der wichtigste Punkt dieser Migration:
--
--   scene_resonance         gehoert einem Menschen. Traegt Freitext, ist Fallmaterial,
--                           faellt unter Auskunft, Export und Loeschung.
--   scene_resonance_counts  gehoert niemandem. Vier Zahlen je Szene, sonst nichts -
--                           keine Kennung, keine Sitzung, keine IP, kein Zeitstempel je
--                           Reaktion. Aus ihr laesst sich kein Mensch zurueckgewinnen.
--
-- Die Trennung ist der Grund, warum die oeffentliche Anzeige ("147 Menschen kennen das")
-- ueberhaupt vertretbar ist. Wuerde derselbe Datensatz beides tragen, waere jeder Zaehler
-- ein personenbezogenes Datum ueber eine Gesundheitsfrage - und der Besucher, der ohne
-- Konto auf einen Knopf tippt, hat in nichts eingewilligt.

-- ── Die persoenliche Resonanz ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scene_resonance (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,

    -- Slug der Content-Szene (apps/web/content/scene/<slug>.md). Bewusst KEIN Fremd-
    -- schluessel: Die Szenen leben im Repository, nicht in der Datenbank. Wird eine Szene
    -- zurueckgezogen, bleibt die Resonanz bestehen und wird beim Lesen uebersprungen -
    -- besser, als jemandem seine Eintraege unter den Haenden verschwinden zu lassen.
    scene_slug        TEXT NOT NULL,

    -- Optional, und das ist der Kern des Modells: Reagiert wird auf einer oeffentlichen
    -- Seite, auf der kein Fall im Blick ist. Wer genau einen Fall hat, bekommt ihn still
    -- zugeordnet; wer mehrere hat, ordnet spaeter im Ueberblick zu, wo er den Zusammenhang
    -- vor Augen hat. Ein Auswahlfeld auf der Leseseite wuerde die eine Geste zerstoeren,
    -- um die es hier geht.
    --
    -- SET NULL statt CASCADE: "Das kenne ich" ist eine Aussage ueber den Menschen, nicht
    -- ueber die Beziehung. Wer einen Fall loescht, loescht nicht seine Wiedererkennung.
    case_id           UUID REFERENCES cases (id) ON DELETE SET NULL,

    reaction          TEXT NOT NULL CHECK (reaction IN (
        'kenne_ich', 'kannte_ich', 'andere_seite', 'nicht_meins'
    )),

    -- Beide 1-5, und die zweite absichtlich im selben Bereich wie scenes.distress_score.
    -- Eine wiedererkannte Szene und eine selbst geschriebene sprechen damit dieselbe
    -- Sprache; zwei Zahlenwelten nebeneinander waeren nicht vergleichbar und niemand
    -- koennte sagen, warum.
    frequency         SMALLINT CHECK (frequency BETWEEN 1 AND 5),
    distress          SMALLINT CHECK (distress BETWEEN 1 AND 5),

    -- Der eigentliche Schatz: "Was ist bei dir anders?". Verschluesselt at rest wie jeder
    -- andere Freitext (Fernet, enc:v1) - hier steht Beziehungsgeschichte drin.
    note              TEXT,

    -- Gesetzt, sobald aus der Notiz eine echte Fall-Szene geworden ist. Damit laesst sich
    -- im Ueberblick "daraus wurde Szene 12" zeigen, statt dieselbe Geschichte zweimal
    -- anzubieten.
    promoted_scene_id UUID REFERENCES scenes (id) ON DELETE SET NULL,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Eine Meinung je Mensch und Szene. Wer sie aendert, aendert die Zeile.
    UNIQUE (user_id, scene_slug)
);

CREATE INDEX IF NOT EXISTS idx_scene_resonance_user ON scene_resonance (user_id);
CREATE INDEX IF NOT EXISTS idx_scene_resonance_case ON scene_resonance (case_id);

-- ── Der anonyme Zaehler ──────────────────────────────────────────────────────
-- Vier Zeilen je Szene, mehr nicht. Hochgezaehlt von eingeloggten UND nicht eingeloggten
-- Reaktionen: Ein Zaehler, der nur die Haelfte der Menschen mitzaehlt, behauptet eine Zahl,
-- die es nicht gibt.
--
-- CHECK (anzahl >= 0): Der Zaehler wird beim Aendern einer Reaktion heruntergesetzt. Der
-- Dienst klemmt selbst auf null, damit eine auseinandergelaufene Rechnung niemandem den
-- Knopf blockiert - der Zaehler ist Beiwerk, die Geste des Menschen ist es nicht. Diese
-- Bedingung ist das Fangnetz fuer alles, was an resonanz_service vorbei schreibt.
CREATE TABLE IF NOT EXISTS scene_resonance_counts (
    scene_slug  TEXT NOT NULL,
    reaction    TEXT NOT NULL CHECK (reaction IN (
        'kenne_ich', 'kannte_ich', 'andere_seite', 'nicht_meins'
    )),
    anzahl      BIGINT NOT NULL DEFAULT 0 CHECK (anzahl >= 0),
    PRIMARY KEY (scene_slug, reaction)
);

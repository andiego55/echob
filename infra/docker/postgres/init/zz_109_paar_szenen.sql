-- Beziehungsszenen im Paarraum: ein Regal und eine Runde.
--
-- WARUM DAS IM PAARRAUM FEHLTE. Er wird bisher ausschliesslich mit eigenem Material
-- gefuettert - Sitzungen, Abmachungen, ehrliche Mitteilungen, Tests. Also genau mit dem,
-- worueber zwei Menschen im Streit nicht reden koennen. Eine erfundene Szene ist neutraler
-- Boden: Niemand hat sie getan, also muss sich niemand verteidigen.
--
-- ZWEI DINGE, EIN FUNDAMENT.
--
--   couple_scene_picks   Das Regal. Jeder waehlt drei bis fuenf Szenen, die zu ihnen
--                        passen; die Auswahl des anderen ist sichtbar. Die Ueberschneidung
--                        ist gemeinsamer Boden, die Differenz ist das Thema - und beides
--                        steht da, ohne dass es jemand aussprechen musste.
--
--   couple_scene_rounds  Die Runde. Einer schlaegt eine Szene vor, der andere nimmt an
--                        (oder lehnt ab - sonst waere Annehmen keine Entscheidung), dann
--                        antworten beide getrennt. Aufgedeckt wird erst, wenn beide fertig
--                        sind.
--
-- DIE REGEL, DIE ALLES TRAEGT: BLIND BIS BEIDE FERTIG SIND. Wer die Antwort des anderen
-- vorher saehe, antwortete darauf statt auf die Szene - und die ganze Uebung waere zwecklos.
-- Durchgesetzt wird das im Dienst (`paar_szenen_service.stand`), nicht in der Oberflaeche:
-- Was der Server herausgibt, entscheidet, nicht was das Frontend anzeigt.
--
-- Dasselbe Muster wie `couple_honest_rounds` (94_couple_honest.sql), bewusst: Wer eines
-- der beiden versteht, versteht das andere.

-- ── Das Regal ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS couple_scene_picks (
    couple_id   UUID NOT NULL REFERENCES couple_links (id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    scene_slug  TEXT NOT NULL,
    -- Optional: warum diese. Verschluesselt - hier steht schnell mehr, als der Satz
    -- vermuten laesst.
    grund       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (couple_id, user_id, scene_slug)
);

CREATE INDEX IF NOT EXISTS idx_couple_scene_picks_paar
    ON couple_scene_picks (couple_id);

-- ── Die Runde ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS couple_scene_rounds (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id         UUID NOT NULL REFERENCES couple_links (id) ON DELETE CASCADE,
    scene_slug        TEXT NOT NULL,

    -- getrennt = beide beantworten offene Fragen zur Szene
    -- geraten  = beide antworten UND raten die Antwort des anderen (Multiple Choice)
    art               TEXT NOT NULL CHECK (art IN ('getrennt', 'geraten')),

    -- Die letzte Frage zeigt von der erfundenen Szene auf das Paar („Kommt so etwas bei
    -- euch vor?"). Sie ist die wertvollste und die einzige, deren Antwort sich als Vorwurf
    -- lesen laesst - deshalb vor dem Start abwaehlbar, von beiden.
    mit_bruecke       BOOLEAN NOT NULL DEFAULT true,

    vorgeschlagen_von UUID NOT NULL,
    status            TEXT NOT NULL DEFAULT 'vorgeschlagen'
                      CHECK (status IN ('vorgeschlagen', 'laeuft', 'aufgedeckt', 'abgelehnt')),

    created_at        TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    angenommen_at     TIMESTAMPTZ,
    aufgedeckt_at     TIMESTAMPTZ,
    abgelehnt_at      TIMESTAMPTZ
);

-- Hoechstens EINE Runde gleichzeitig je Paarraum. Zwei parallele Runden waeren zwei
-- Gespraeche, die keines mehr sind - dieselbe Begruendung wie beim ehrlichen Mitteilen.
CREATE UNIQUE INDEX IF NOT EXISTS idx_couple_scene_one_open
    ON couple_scene_rounds (couple_id)
    WHERE status IN ('vorgeschlagen', 'laeuft');

CREATE INDEX IF NOT EXISTS idx_couple_scene_rounds_paar
    ON couple_scene_rounds (couple_id, created_at DESC);

-- ── Die Antworten ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS couple_scene_answers (
    round_id    UUID NOT NULL REFERENCES couple_scene_rounds (id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    -- Verschluesselt. Bei 'getrennt' Freitext je Frage; bei 'geraten' je Frage die eigene
    -- Antwort und die Vermutung ueber die andere Person.
    antworten   JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Gesetzt, wenn die Person auf „Fertig" getippt hat. Erst wenn BEIDE gesetzt sind,
    -- wird aufgedeckt. Ein Entwurf ohne diesen Zeitpunkt bleibt fuer die andere Person
    -- unsichtbar.
    fertig_at   TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (round_id, user_id)
);

-- Das Gefuehlsbild: wie es dir in dieser Beziehung gerade geht.
--
-- DAS PROBLEM. Wer belastet ist, kann oft nicht sagen, wie es ihm geht. Nicht aus
-- Unwilligkeit - die Worte sind schlicht nicht da, oder das einzige, das kommt, ist
-- "schlecht". Jedes Textfeld, das nach Gefuehlen fragt, laeuft bei genau diesen Menschen
-- leer, und das sind die, um die es geht.
--
-- DREI ZUGAENGE, WEIL DAS NICHT EINE URSACHE HAT.
--
--   szenen   Du brauchst keine Worte. Du zeigst auf erfundene Szenen, die sich anfuehlen
--            wie du gerade. Ein projektives Verfahren - und die 178 Szenen sind dafuer ein
--            fertiges Instrument.
--   feld     Zwei Achsen zum Ziehen: angenehm/unangenehm mal ruhig/aufgewuehlt. Auch das
--            geht ohne ein einziges Wort. Dazu zwei Regler, die nur in einer Beziehung
--            Sinn ergeben: Naehe und Sicherheit.
--   woerter  Fuer die, die ein grobes Wort haben und das genaue suchen. Sieben Familien,
--            die sich beim Antippen auffaechern: "schlecht" -> beschaemt, klein, wertlos.
--
-- Daraus schreibt Echo einen Text, den die Person BEARBEITEN und dann bestaetigen kann.
-- Erst das Bestaetigte geht in den Kontext und kann freigegeben werden - ein Entwurf ist
-- eine Momentaufnahme im Werden, keine Aussage.
--
-- WARUM NICHT `scene_resonance` WIEDERVERWENDET WIRD, obwohl auch hier Szenen gewaehlt
-- werden: Dort lautet die Frage "kenne ich das?" - eine stehende Aussage ueber Erlebtes.
-- Hier lautet sie "fuehlt sich an wie ich, jetzt" - eine Momentaufnahme, die naechste Woche
-- anders ausfaellt. Dieselbe Tabelle haette beides vermischt und beide unbrauchbar gemacht.

CREATE TABLE IF NOT EXISTS feeling_snapshots (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id       UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id       UUID NOT NULL,

    -- entwurf    = wird gerade zusammengestellt, gehoert niemandem ausser der Person
    -- bestaetigt = steht; fliesst in den Echo-Kontext und ist freigebbar
    status        TEXT NOT NULL DEFAULT 'entwurf'
                  CHECK (status IN ('entwurf', 'bestaetigt')),

    -- Die drei Zugaenge. Alle drei sind freiwillig - wer nur Szenen tippt, hat ein
    -- gueltiges Gefuehlsbild.
    szenen        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- Slugs, unverschluesselt (oeffentlich)
    feld          JSONB NOT NULL DEFAULT '{}'::jsonb,   -- valenz/aktivierung/naehe/sicherheit
    woerter       JSONB NOT NULL DEFAULT '[]'::jsonb,   -- Schluessel aus dem Wortfeld

    -- Freitext der Person. Verschluesselt.
    eigenes       TEXT,
    -- Was Echo geschrieben hat, nach der Bearbeitung durch die Person. Verschluesselt.
    bericht       TEXT,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    bestaetigt_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_feeling_snapshots_fall
    ON feeling_snapshots (case_id, created_at DESC);

-- Hoechstens EIN Entwurf je Fall. Zwei halbfertige Gefuehlsbilder nebeneinander waeren
-- keine Momentaufnahme mehr, sondern eine Baustelle - und beim naechsten Aufruf wuesste
-- niemand, welches gemeint ist.
CREATE UNIQUE INDEX IF NOT EXISTS idx_feeling_snapshots_ein_entwurf
    ON feeling_snapshots (case_id)
    WHERE status = 'entwurf';

COMMENT ON COLUMN feeling_snapshots.szenen IS
    'Slugs oeffentlicher Content-Szenen - kein Personenbezug, deshalb unverschluesselt.';
COMMENT ON COLUMN feeling_snapshots.bericht IS
    'Echos Text NACH der Bearbeitung durch die Person. Was hier steht, hat sie gebilligt.';

-- ── Freigabe an die Fachperson ───────────────────────────────────────────────
-- Dasselbe Vorgehen wie bei 'documents' und 'artifacts' (99_share_documents_artifacts):
-- Bedingung loesen, neu setzen. Eine zusaetzliche WAHLMOEGLICHKEIT aendert nichts an dem,
-- was frueher erteilte Einwilligungen abdecken - die Erklaerung lautet "nur, was ich oben
-- ausgewaehlt habe". Eine neue Einwilligungsfassung ist deshalb nicht noetig.
ALTER TABLE case_share_elements DROP CONSTRAINT IF EXISTS case_share_elements_element_type_check;
ALTER TABLE case_share_elements ADD CONSTRAINT case_share_elements_element_type_check
    CHECK (element_type IN (
        'case_info', 'onboarding', 'all_scenes', 'scene',
        'scales', 'reports', 'topic_summaries', 'person_profile', 'self_profile',
        'hypotheses', 'test_results',
        'documents', 'artifacts',
        'gefuehlsbild'
    ));

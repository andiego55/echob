-- 98: Stabile Laufnummern fuer Szenen, Dokumente und Artefakte.
--
-- **Der Fehler, den das behebt.** Echo verweist in seinen Antworten auf "Szene 25". Diese
-- Nummer war bisher keine Eigenschaft der Szene, sondern ihre POSITION in einer nach Datum
-- absteigend sortierten Liste (build_case_context, enumerate). Damit verschob jede neue
-- Szene alle aelteren, und eine nachtraeglich korrigierte Datumsangabe ebenso.
--
-- Nachgemessen an einem Beispielfall: Dieselbe Szene heisst bei zwei Szenen im Fall
-- "Szene 1" und bei dreien "Szene 2".
--
-- Die Folge sah man nicht, und das war das Schlimme daran: Ein Bericht vom Mai, der
-- "Szene 25" nennt, zeigt im August auf eine ANDERE Szene - und niemand merkt es, weil
-- dort ja eine Szene 25 existiert. Dasselbe galt fuer gespeicherte Hypothesen,
-- Themen-Zusammenfassungen und Artefakte. Ein anklickbarer Beleg waere auf dieser
-- Grundlage schlimmer als keiner: Er fuehrte verlaesslich zur falschen Szene.
--
-- **Warum nach created_at nummeriert wird und nicht nach scene_date.** created_at ist
-- unveraenderlich; das Belegdatum kann jemand nachtraeglich korrigieren. Waere die
-- Reihenfolge daran geknuepft, verschoeben sich die Nummern wieder - genau der Fehler,
-- den diese Migration behebt. "Die zwoelfte Szene, die ich geschrieben habe" ist ausserdem
-- etwas, das jemand wiedererkennt.
--
-- **Warum ein Trigger und keine Zuweisung im Code.** Szenen entstehen an vier Stellen im
-- Backend (scenes.py, echo.py finalize-scene, institute.py, case_generation_service.py),
-- dazu in drei Seed-Dateien und in etlichen Tests. Jede davon zu aendern hiesse, beim
-- naechsten neuen Pfad daran denken zu muessen - und wer es vergisst, erzeugt eine Szene
-- ohne Nummer, die dann nirgends verlinkbar ist. Die Datenbank vergisst es nicht.
--
-- Der eindeutige Index ist der Waechter: Sollten zwei Einfuegungen desselben Falls je
-- gleichzeitig dieselbe Nummer ziehen, bricht es auf - statt still zwei Szene 12 zu haben.
--
-- Idempotent: mehrfach ausfuehrbar.

-- ── Spalten ──────────────────────────────────────────────────────────────────

ALTER TABLE scenes         ADD COLUMN IF NOT EXISTS scene_no    INTEGER;
ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS doc_no      INTEGER;
ALTER TABLE case_artifacts ADD COLUMN IF NOT EXISTS artifact_no INTEGER;

-- ── Bestand nachtragen ───────────────────────────────────────────────────────
-- `id` als zweites Sortierkriterium, damit zwei Zeilen mit derselben Sekunde eine
-- feste Reihenfolge haben und ein zweiter Lauf dasselbe Ergebnis liefert.

WITH nummeriert AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY case_id ORDER BY created_at, id) AS nr
    FROM scenes
)
UPDATE scenes s SET scene_no = n.nr
FROM nummeriert n WHERE s.id = n.id AND s.scene_no IS NULL;

WITH nummeriert AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY case_id ORDER BY created_at, id) AS nr
    FROM case_documents
)
UPDATE case_documents d SET doc_no = n.nr
FROM nummeriert n WHERE d.id = n.id AND d.doc_no IS NULL;

WITH nummeriert AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY case_id ORDER BY created_at, id) AS nr
    FROM case_artifacts
)
UPDATE case_artifacts a SET artifact_no = n.nr
FROM nummeriert n WHERE a.id = n.id AND a.artifact_no IS NULL;

-- ── Neue Zeilen bekommen ihre Nummer automatisch ─────────────────────────────

CREATE OR REPLACE FUNCTION scenes_laufnummer() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.scene_no IS NULL THEN
        SELECT COALESCE(MAX(scene_no), 0) + 1 INTO NEW.scene_no
        FROM scenes WHERE case_id = NEW.case_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION case_documents_laufnummer() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.doc_no IS NULL THEN
        SELECT COALESCE(MAX(doc_no), 0) + 1 INTO NEW.doc_no
        FROM case_documents WHERE case_id = NEW.case_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION case_artifacts_laufnummer() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.artifact_no IS NULL THEN
        SELECT COALESCE(MAX(artifact_no), 0) + 1 INTO NEW.artifact_no
        FROM case_artifacts WHERE case_id = NEW.case_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scenes_laufnummer ON scenes;
CREATE TRIGGER trg_scenes_laufnummer
    BEFORE INSERT ON scenes
    FOR EACH ROW EXECUTE FUNCTION scenes_laufnummer();

DROP TRIGGER IF EXISTS trg_case_documents_laufnummer ON case_documents;
CREATE TRIGGER trg_case_documents_laufnummer
    BEFORE INSERT ON case_documents
    FOR EACH ROW EXECUTE FUNCTION case_documents_laufnummer();

DROP TRIGGER IF EXISTS trg_case_artifacts_laufnummer ON case_artifacts;
CREATE TRIGGER trg_case_artifacts_laufnummer
    BEFORE INSERT ON case_artifacts
    FOR EACH ROW EXECUTE FUNCTION case_artifacts_laufnummer();

-- ── Waechter: eine Nummer je Fall nur einmal ─────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_scenes_no
    ON scenes (case_id, scene_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_documents_no
    ON case_documents (case_id, doc_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_artifacts_no
    ON case_artifacts (case_id, artifact_no);

-- 96: Dokumente zum Fallkontext.
--
-- **Was das ist.** Ein Brief, ein Chatverlauf, eine Sprachnachricht als Abschrift: Dinge,
-- die zur Beziehung gehoeren, aber keine Szene sind. Eine Szene ist ein Ereignis, das
-- jemand erzaehlt. Ein Dokument ist ein Beleg, den jemand mitbringt.
--
-- **Nur Text.** Es wird keine Datei gespeichert, sondern ihr Inhalt. Die Oberflaeche liest
-- eine .txt/.md im Browser aus und schickt den Text; hier landet nie ein Blob, kein
-- Dateiformat, kein MIME-Typ. Damit gibt es auch nichts zu scannen, zu konvertieren oder
-- versehentlich auszuliefern - und keinen zweiten Speicherort neben der Datenbank.
--
-- **Verschluesselt.** `content` und `description` liegen wie Szenentexte at-rest
-- verschluesselt (Fernet, siehe app/core/crypto.py). `title` bleibt im Klartext, damit
-- Listen ohne Entschluesselung sortierbar bleiben - wie bei scenes.title.
--
-- **Warum ein Zeichenlimit in der Datenbank.** Der Inhalt fliesst in den Echo-Kontext.
-- Ohne harte Grenze traegt ein einziges eingefuegtes Postfach das Kontextfenster fort, und
-- der Fehler faellt erst an der Rechnung auf. 6000 Zeichen sind rund zwei A4-Seiten in
-- Schriftgroesse 12 (bei 2,5 cm Rand und 1,15 Zeilenabstand ~2850 Zeichen je Seite).
-- Die Zahl steht zusaetzlich im Backend und in der Oberflaeche; hier ist der letzte Riegel.
--
-- Idempotent: mehrfach ausfuehrbar.

CREATE TABLE IF NOT EXISTS case_documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id       UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id       UUID NOT NULL,

    title         TEXT NOT NULL,
    kind          TEXT NOT NULL DEFAULT 'sonstiges' CHECK (kind IN (
        'brief', 'chatverlauf', 'nachricht', 'notiz', 'protokoll', 'sonstiges'
    )),
    -- Wann das Dokument entstanden ist, nicht wann es hochgeladen wurde. Darf fehlen:
    -- Bei einem alten Brief weiss man das Datum oft nicht mehr.
    document_date DATE,

    -- Was ist das, und worauf soll Echo achten? Verschluesselt.
    description   TEXT,
    -- Der Text selbst. Verschluesselt.
    content       TEXT NOT NULL,
    -- Zeichenzahl des KLARTEXTS. Verschluesselt waere length(content) sinnlos, und die
    -- Oberflaeche soll das Budget anzeigen koennen, ohne jedes Dokument zu entschluesseln.
    char_count    INTEGER NOT NULL CHECK (char_count > 0 AND char_count <= 6000),

    -- Dateiname, falls der Text aus einer Datei kam. Nur zur Wiedererkennung.
    source_name   TEXT,

    -- Ob das Dokument in Gespraeche einfliesst. Manches legt man ab, ohne dass es in
    -- jeder Antwort mitreden soll.
    active        BOOLEAN NOT NULL DEFAULT true,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents (case_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_user_id ON case_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_date
    ON case_documents (case_id, document_date DESC NULLS LAST, created_at DESC);

-- zz_136_podcasts.sql
-- Das Podcast-Studio: der eigene Fall als gesprochene Nachricht.
--
-- ZWEI TABELLEN, UND DIE TRENNUNG IST DIE GANZE ARCHITEKTUR
--   case_podcasts          Eine Folge: die Einstellungen, der Stand, der Titel.
--   case_podcast_kapitel   Je Kapitel eine Zeile: der Text UND die Tonspur.
--
-- WARUM DAS KAPITEL DIE EINHEIT IST
-- Die Sprachschnittstelle nimmt rund 4.000 Zeichen je Aufruf - etwa vier bis fuenf Minuten.
-- Eine zwanzigminuetige Folge muss also ohnehin zerlegt werden, und die natuerliche
-- Schnittkante ist das Kapitel. Daraus faellt dreierlei ab, das man sonst extra baeuchte:
--
--   * Kapitelsprung im Abspieler,
--   * Fortschritt waehrend der Erzeugung ("3 von 6 gesprochen") statt einer Minute Stille,
--   * Wiederaufnahme: Bricht Kapitel vier ab, sind eins bis drei gesprochen und bleiben es.
--
-- Zusammengefuegt wird beim Abspielen, nicht beim Erzeugen. Kein Zusammenschneiden auf dem
-- Server, keine Audio-Bibliothek, keine ffmpeg-Abhaengigkeit.
--
-- WARUM DER TON IN DER DATENBANK LIEGT UND NICHT IN EINEM OBJEKTSPEICHER
-- Das ist die unbequemere von zwei Moeglichkeiten und trotzdem die richtige.
--
-- storage_service kann heute nur OEFFENTLICHE Bilder. Ein oeffentlicher Link auf eine
-- Tonaufnahme ueber eine Beziehung ist keine Option - er laesst sich weiterschicken,
-- indizieren und nicht zurueckholen. Ein privater Eimer mit signierten Links waere neue
-- Infrastruktur: mit eigener Loeschung, eigenem Export, eigener Sicherung.
--
-- In der Datenbank faellt all das weg. Die Kontoloeschung nimmt die Zeilen mit, und die
-- naechtliche age-verschluesselte Sicherung deckt sie ab, ohne dass irgendwo eine Liste
-- ergaenzt werden muss.
--
-- NACHTRAG, 30.09.2026: Hier stand, der Datenexport gehe "ohne die Tonspuren". Das war eine
-- Behauptung und kein Zustand - SELECT * nahm sie mit, und ein Test ueber den echten Weg hat
-- es gezeigt. Jetzt schliesst die Auskunft JEDE bytea-Spalte aus, gefragt aus dem Schema
-- statt aufgelistet: Hex ist doppelt so lang wie das Byte, ~4,8 MB je Folge, und eine
-- JSON-Datei, die sich nicht mehr oeffnen laesst, ist keine Auskunft. Der Kapiteltext steht
-- drin - und der IST das Gesprochene. Der Preis ist Groesse: 32 kbit/s Mono
-- ergibt rund 2,4 MB fuer zwanzig Minuten.
--
-- Sollte es eng werden, ist der Umzug eine Aenderung an EINER Stelle - deshalb liegt der
-- Zugriff hinter einem Endpunkt mit Rechtepruefung und nie hinter einer URL.
--
-- WAS VERSCHLUESSELT IST
-- Der Kapiteltext wie jeder eigene Text (Fernet, enc:-Praefix). Der Ton NICHT: Fernet auf
-- 2,4 MB je Abruf zu legen kostet Rechenzeit bei jedem Abspielen, und die Bytes sind
-- ohnehin nur ueber einen Endpunkt mit Eigentumspruefung erreichbar. Wer die Datenbank hat,
-- hat sie - das gilt fuer die at-rest-Verschluesselung der Platte, nicht fuer Feldkrypto.
-- Diese Abwaegung steht hier, damit sie jemand bewusst revidieren kann.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_136_podcasts.sql

CREATE TABLE IF NOT EXISTS case_podcasts (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id      UUID        NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL,

    -- Die Einstellungen, mit denen die Folge entstanden ist. Sie bleiben stehen: Wer in
    -- drei Monaten hoert, soll sehen koennen, WORAUS das entstanden ist - und eine Folge
    -- noch einmal mit denselben Reglern erzeugen koennen.
    format       TEXT        NOT NULL,
    laenge       TEXT        NOT NULL,
    stimme       TEXT        NOT NULL,
    ansprache    TEXT        NOT NULL,
    -- {"szenen": "mittelpunkt", "skalen": "aus", ...}
    gewichte     JSONB       NOT NULL DEFAULT '{}'::jsonb,

    -- Vom Modell erzeugt, von der Person aenderbar. Feldverschluesselt.
    titel        TEXT,

    -- entwurf   Angelegt, noch kein Skript.
    -- skript    Der Text steht, es ist noch nichts gesprochen.
    -- spricht   Die Sprachausgabe laeuft.
    -- fertig    Alle Kapitel haben eine Tonspur.
    -- fehler    Abgebrochen; `fehler` sagt, woran.
    status       TEXT        NOT NULL DEFAULT 'entwurf'
                 CHECK (status IN ('entwurf','skript','spricht','fertig','fehler')),
    fehler       TEXT,

    -- Gesamtlaenge in Sekunden, sobald alle Kapitel gesprochen sind. Sie ist auch die
    -- Einheit des Kontingents: Gezaehlt werden Minuten, nicht Folgen - eine Folge zu
    -- zaehlen belohnt die lange und bestraft die kurze.
    sekunden     INTEGER,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_case_podcasts_fall
    ON case_podcasts (case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_podcasts_person
    ON case_podcasts (user_id);

CREATE TABLE IF NOT EXISTS case_podcast_kapitel (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    podcast_id   UUID        NOT NULL REFERENCES case_podcasts (id) ON DELETE CASCADE,

    -- Die Reihenfolge ist die Aussage, nicht die Sortierung einer Liste.
    nr           INTEGER     NOT NULL,
    -- Der Schluessel aus dem Katalog ('muster', 'wirkung', ...). Aendert sich ein Format
    -- spaeter, bleibt die Folge lesbar: Der Titel steht daneben.
    kapitel_key  TEXT        NOT NULL,
    titel        TEXT        NOT NULL,

    -- Feldverschluesselt wie jeder eigene Text.
    text         TEXT        NOT NULL,

    -- Die Tonspur. NULL, solange dieses Kapitel nicht gesprochen ist - daran haengt die
    -- Wiederaufnahme nach einem Abbruch.
    audio        BYTEA,
    audio_typ    TEXT,
    sekunden     INTEGER,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT case_podcast_kapitel_nr_unique UNIQUE (podcast_id, nr)
);

CREATE INDEX IF NOT EXISTS idx_case_podcast_kapitel_folge
    ON case_podcast_kapitel (podcast_id, nr);

COMMENT ON TABLE  case_podcasts IS
    'Eine Podcast-Folge ueber einen Fall. Die Einstellungen bleiben stehen, damit sich '
    'dieselbe Folge nachvollziehen und neu erzeugen laesst.';
COMMENT ON COLUMN case_podcast_kapitel.audio IS
    'MP3-Bytes, NICHT feldverschluesselt - erreichbar nur ueber den Endpunkt mit '
    'Eigentumspruefung. Begruendung im Kopf von zz_136.';
COMMENT ON COLUMN case_podcasts.sekunden IS
    'Gesamtlaenge; zugleich die Einheit des Monatskontingents (Minuten, nicht Folgen).';

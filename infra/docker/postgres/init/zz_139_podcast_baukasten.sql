-- zz_139_podcast_baukasten.sql
-- Eigene Kapitel, eine eigene Anweisung, ein Anker an einer Szene.
--
-- WAS DAZUKOMMT UND WARUM JEWEILS
--
--   case_podcasts.eigene_anweisung
--     Ein Freitextfeld je Folge - fuer ALLE Formate, nicht nur fuer eigene. Es ist der
--     Eingriffspunkt fuer alles, was der Katalog nicht vorsieht ("nenn meine Kinder nicht",
--     "bleib bei dem Abend im Maerz", "weniger ueber sie, mehr ueber mich").
--
--     Feldverschluesselt wie jeder eigene Text: Es ist ein Satz ueber das eigene Leben,
--     nicht eine Einstellung.
--
--   case_podcast_kapitel.auftrag
--     Bei einem eigenen Kapitel: was die Person fuer dieses Kapitel bestellt hat. Bei einem
--     Format aus dem Katalog bleibt es NULL - dort steht der Auftrag im Katalog, und ihn
--     mitzuschreiben hiesse, eine zweite Wahrheit anzulegen, die beim naechsten Umbau
--     auseinanderlaeuft.
--
--     Gespeichert, damit die Folge nachvollziehbar bleibt: Wer in drei Monaten hoert, soll
--     lesen koennen, was er bestellt hat - und nicht nur, was dabei herauskam.
--
--   case_podcast_kapitel.szene_id
--     Der Baustein "Eine Szene ausbauen" haengt an EINER bestimmten Szene. Ohne diesen
--     Verweis waere es eine Aufforderung an das Modell, sich eine auszusuchen, und es nimmt
--     die erste.
--
--     ON DELETE SET NULL, nicht CASCADE: Loescht jemand spaeter die Szene, soll nicht die
--     Podcast-Folge verschwinden. Der gesprochene Text ist dann schon da und gehoert der
--     Person; er wird nicht falsch, weil die Quelle weg ist. Das Kapitel verliert nur seinen
--     Anker.
--
--   case_podcast_kapitel.kapitel_laenge
--     Kurz / normal / ausfuehrlich. Verteilt das Wortbudget auf die eigenen Kapitel - bei
--     Formaten aus dem Katalog macht das der Anteil im Katalog.
--
-- KEIN CHECK AUF format
-- case_podcasts.format ist TEXT ohne Pruefbedingung, also traegt 'eigenes' ohne Migration.
-- Das ist hier ein Vorteil und sonst eine Falle - siehe den Kommentar in zz_137 dazu, was
-- eine fehlende CHECK-Erweiterung anrichtet.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_139_podcast_baukasten.sql

ALTER TABLE case_podcasts
    ADD COLUMN IF NOT EXISTS eigene_anweisung TEXT;

ALTER TABLE case_podcast_kapitel
    ADD COLUMN IF NOT EXISTS auftrag TEXT;

ALTER TABLE case_podcast_kapitel
    ADD COLUMN IF NOT EXISTS szene_id UUID REFERENCES scenes (id) ON DELETE SET NULL;

ALTER TABLE case_podcast_kapitel
    ADD COLUMN IF NOT EXISTS kapitel_laenge TEXT;

CREATE INDEX IF NOT EXISTS idx_case_podcast_kapitel_szene
    ON case_podcast_kapitel (szene_id) WHERE szene_id IS NOT NULL;

COMMENT ON COLUMN case_podcasts.eigene_anweisung IS
    'Freitext der Person fuer diese Folge, feldverschluesselt. Geht als WUNSCH in den '
    'Prompt, und die Regeln stehen danach noch einmal - siehe EIGENE_ANWEISUNG_RAHMEN.';
COMMENT ON COLUMN case_podcast_kapitel.auftrag IS
    'Nur bei eigenen Kapiteln: was die Person bestellt hat. Bei Katalog-Formaten NULL, '
    'weil der Auftrag dort im Katalog steht.';
COMMENT ON COLUMN case_podcast_kapitel.szene_id IS
    'Anker fuer den Baustein "Eine Szene ausbauen". SET NULL beim Loeschen der Szene: Der '
    'gesprochene Text bleibt, er wird nicht falsch, weil die Quelle weg ist.';

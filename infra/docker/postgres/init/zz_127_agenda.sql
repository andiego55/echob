-- zz_127_agenda.sql
-- "Das moechte ich besprechen" - die Tagesordnung fuer den naechsten Termin.
--
-- WARUM
-- Der Bauplan: "An jedem Satz, jedem Puls, jedem Portraet eine kleine Markierung: beim
-- naechsten Termin ansprechen. Daraus wird eine kurze Liste." Und die Begruendung:
--
--   Das beantwortet die Frage, die sonst offen bliebe: Was mache ich jetzt mit dieser
--   Erkenntnis?
--
-- Zwischen "ich habe etwas ueber mich herausgefunden" und "ich spreche es an" liegt der
-- Termin - und drei Wochen, in denen man es vergisst. Genau dort setzt das hier an.
--
-- WARUM ES (VORERST) NICHT GETEILT WIRD
-- Der Bauplan nennt es "die sanfteste Form der Freigabe". Das geht so aber nicht, und der
-- Grund steht zwei Abschnitte weiter oben im selben Text: "Ausdruecklich nie freigebbar:
-- die rohen Pulse mit Freitext." Eine Tagesordnung, auf der Pulse stehen duerfen, kann
-- als Ganzes nicht freigegeben werden, ohne genau das mitzunehmen.
--
-- Die Liste ist deshalb zunaechst das, was sie im Termin ohnehin ist: etwas, das die
-- Person selbst mitbringt und vorliest. Wer sie spaeter doch uebergeben will, gibt die
-- einzelnen Saetze frei - dafuer gibt es den Weg schon. Eine Freigabe der Agenda waere
-- ein neues Element und damit VIER Stellen (DB-CHECK, Literal, Etiketten, Ankreuzliste);
-- sie zu bauen, bevor jemand danach gefragt hat, waere Vorrat statt Nachfrage.
--
-- WARUM EINE EIGENE TABELLE STATT DREIER SPALTEN
-- Der naheliegende Weg waere ein boolean an selbst_saetze, selbst_pulse und
-- selbst_portraits. Drei Spalten, drei Abfragen - und bei der vierten Form eine vierte
-- von beidem. Eine Markierung ist keine Eigenschaft eines Satzes; sie ist ein Eintrag auf
-- einer Liste, und die hat ihren eigenen Lebenslauf (draufsetzen, Notiz, wieder
-- runternehmen).
--
-- WARUM DREI SPALTEN STATT EINER art+ziel_id
-- Eine Kennung ohne Fremdschluessel zeigt irgendwann auf nichts: Wer einen Satz loescht,
-- laesst einen Eintrag zurueck, den niemand mehr aufloesen kann - und die Liste zeigt
-- eine Luecke ohne Erklaerung. Drei nullbare Fremdschluessel mit ON DELETE CASCADE
-- raeumen sich selbst auf. Dieselbe Bauart wie case_share_elements.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_127_agenda.sql

CREATE TABLE IF NOT EXISTS selbst_agenda (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL,

    -- Genau EINES der drei ist gesetzt. Die Bedingung unten erzwingt das.
    satz_id      UUID        REFERENCES selbst_saetze (id)    ON DELETE CASCADE,
    puls_id      UUID        REFERENCES selbst_pulse (id)     ON DELETE CASCADE,
    portrait_id  UUID        REFERENCES selbst_portraits (id) ON DELETE CASCADE,

    -- "Warum will ich das ansprechen?" - freiwillig, kurz.
    --
    -- Nicht im Bauplan, und trotzdem hier: Eine Markierung an einem Puls ist drei Wochen
    -- spaeter "Dienstag, angespannt 7/10" - und niemand weiss mehr, was daran wichtig
    -- war. Der Satz dazu ist das, was die Liste im Termin brauchbar macht.
    -- Feldverschluesselt wie jeder eigene Text.
    notiz        TEXT,

    -- clock_timestamp(): NOW() waere die Transaktionszeit, und die Reihenfolge der Liste
    -- ist ihre einzige Ordnung.
    created_at   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT selbst_agenda_genau_eins CHECK (
        (satz_id IS NOT NULL)::int
      + (puls_id IS NOT NULL)::int
      + (portrait_id IS NOT NULL)::int = 1
    )
);

ALTER TABLE selbst_agenda ALTER COLUMN created_at SET DEFAULT clock_timestamp();

-- Ein Stueck steht hoechstens einmal auf der Liste. Ohne diese Indizes stuende es nach
-- zwei Klicks zweimal da, und das Wegnehmen traefe nur eines davon.
CREATE UNIQUE INDEX IF NOT EXISTS idx_selbst_agenda_satz
    ON selbst_agenda (satz_id) WHERE satz_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_selbst_agenda_puls
    ON selbst_agenda (puls_id) WHERE puls_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_selbst_agenda_portrait
    ON selbst_agenda (portrait_id) WHERE portrait_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_selbst_agenda_user
    ON selbst_agenda (user_id, created_at);

COMMENT ON TABLE selbst_agenda IS
    'Was beim naechsten Termin angesprochen werden soll - Saetze, Pulse, Portraets. '
    'Privat: Die Person bringt die Liste mit, sie wird nicht freigegeben (Pulse duerfen '
    'das grundsaetzlich nicht).';

COMMENT ON COLUMN selbst_agenda.notiz IS
    'Warum. Freiwillig, verschluesselt.';

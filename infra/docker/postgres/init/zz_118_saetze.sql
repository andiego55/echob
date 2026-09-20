-- zz_118_saetze.sql
-- "Mein Kompass", zweite Grundform: der Satz ueber mich.
--
-- WAS DAS IST
-- Eine bestaetigte Aussage ueber die eigene Person. Jeder Satz traegt eine ART
-- (Glaubenssatz, Wert, Grenze, Ausloeser, Staerke, Muster), eine HERKUNFT (woraus er
-- entstanden ist), einen STAND und ein DATUM. Das ist das Gedaechtnis des Raums: Der
-- Puls sagt, wie es gerade ist; der Satz sagt, was sich als wahr herausgestellt hat.
--
-- BESTAETIGT HEISST NICHT WAHR
-- Ein bestaetigter Satz ist eine Selbsteinschaetzung von HEUTE, kein Befund und keine
-- Eigenschaft. Deshalb traegt er sein Datum (bestaetigt_at) und laesst sich jederzeit
-- als ueberholt markieren, statt geloescht zu werden. Ein ueberholter Satz ist oft
-- aufschlussreicher als ein aktueller - an ihm sieht man, dass sich etwas bewegt hat.
--
-- WARUM ECHTE FREMDSCHLUESSEL STATT EINER POLYMORPHEN KENNUNG
-- Die naheliegende Bauweise waere herkunft_typ + herkunft_id ohne Bezug. Dann zeigt eine
-- Kennung ins Leere, sobald die Szene geloescht wird, und niemand merkt es. Hier stehen
-- zwei benannte Spalten mit ON DELETE SET NULL: Der Satz ueberlebt seine Quelle - er
-- gehoert der Person und nicht der Szene -, aber er behauptet keine Herkunft mehr, die
-- es nicht mehr gibt. Eine dritte Quelle (die gefuehrte Uebung) kommt mit P3.
--
-- Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_118_saetze.sql

CREATE TABLE IF NOT EXISTS selbst_saetze (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL,

    -- Die sechs Arten. Die Worte stehen im Katalog (kompass_katalog.py); hier steht nur,
    -- welche es geben darf. Eine siebte Art braucht BEIDE Stellen - das Literal im Code
    -- allein reicht nicht, sonst faellt erst das INSERT.
    art           TEXT        NOT NULL CHECK (art IN (
                      'glaubenssatz', 'wert', 'grenze', 'ausloeser', 'staerke', 'muster'
                  )),

    -- Der Satz selbst, feldverschluesselt. Nicht durchsuchbar, und das ist richtig so:
    -- Was jemand ueber sich schreibt, muss nicht in einem Index stehen.
    text          TEXT        NOT NULL,

    -- 'verworfen' ist hier schon vorgesehen, obwohl noch nichts es setzt: Sobald Echo
    -- Saetze vorschlaegt, darf ein abgelehnter Vorschlag NICHT wiederkommen, und dafuer
    -- muss die Ablehnung erinnert werden. Diese Bedingung nachtraeglich zu aendern
    -- kostet eine Migration in der Produktion - das Wort jetzt mitzunehmen kostet nichts.
    stand         TEXT        NOT NULL DEFAULT 'entwurf' CHECK (stand IN (
                      'entwurf', 'bestaetigt', 'ueberholt', 'verworfen'
                  )),

    -- Woraus der Satz entstanden ist. 'selbst' = die Person hat ihn geschrieben.
    herkunft      TEXT        NOT NULL DEFAULT 'selbst' CHECK (herkunft IN (
                      'selbst', 'szene', 'puls', 'echo'
                  )),
    szene_id      UUID        REFERENCES scenes (id) ON DELETE SET NULL,
    puls_id       UUID        REFERENCES selbst_pulse (id) ON DELETE SET NULL,

    -- Angeheftete Saetze gehen IMMER in die Auswahl fuer Echo, auch wenn sie alt sind.
    -- Das ist der einzige Hebel, mit dem jemand sagen kann: Das hier ist wichtig.
    angeheftet    BOOLEAN     NOT NULL DEFAULT FALSE,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Wann die Person zugestimmt hat. Sichtbar in der Oberflaeche, weil ein Satz von
    -- vor zwei Jahren etwas anderes ist als einer von gestern.
    bestaetigt_at TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Die Liste wird immer nach Person und Stand gelesen, neueste zuerst.
CREATE INDEX IF NOT EXISTS idx_selbst_saetze_user_stand
    ON selbst_saetze (user_id, stand, created_at DESC);

-- Fuer Echos Auswahl: die angehefteten zuerst finden, ohne die ganze Liste zu lesen.
CREATE INDEX IF NOT EXISTS idx_selbst_saetze_angeheftet
    ON selbst_saetze (user_id) WHERE angeheftet;

COMMENT ON TABLE selbst_saetze IS
    'Eine bestaetigte Aussage ueber die eigene Person: Art, Herkunft, Stand, Datum. '
    'Das Gedaechtnis des Kompasses. Bestaetigt heisst Selbsteinschaetzung von heute, '
    'nicht wahr.';

-- 90_couple_impulses.sql
-- Paartherapie: Impulse - kleine Uebungen, die beide getrennt beantworten.
--
-- WARUM. Alles im Paarraum braucht bisher einen Anlass: ein Thema, einen Streit, einen
-- Vorschlag, eine faellige Abmachung. Der Check-in ist die einzige Ausnahme, und er stellt
-- jede Woche dieselben drei Fragen. Wer den Raum oeffnet, ohne dass gerade etwas brennt,
-- findet also entweder Arbeit oder Wiederholung - nie etwas Neues.
--
-- Ein Impuls ist eine Frage, die beide getrennt beantworten und danach nebeneinander
-- sehen. Dieselbe Mechanik wie beim Check-in (erst schreiben, dann sehen), aber mit
-- wechselndem Inhalt aus einem kuratierten Katalog. Das ist das Element, das die Frage
-- "was koennen wir heute machen?" beantwortet, wenn nichts ansteht.
--
-- BEWUSSTE ENTSCHEIDUNGEN:
--
--   * Der Katalog steht im Code, nicht in der Datenbank. Es sind redaktionelle Texte, die
--     mit dem Modul zusammen versioniert und ueberprueft gehoeren - keine Nutzerdaten.
--     Hier liegen nur die Antworten.
--   * `slug` statt Fremdschluessel: Faellt ein Impuls aus dem Katalog, bleiben die
--     Antworten lesbar, statt an einer Fremdschluesselpruefung zu scheitern.
--   * Eine Antwort je Person und Impuls (Primaerschluessel). Nachbessern erlaubt, solange
--     die andere Person noch nicht dran war - das erledigt die Oberflaeche.
--   * Antwort verschluesselt, wie alles im Paarraum.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS couple_impulse_runs (
    couple_id   UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    slug        TEXT NOT NULL,
    user_id     UUID NOT NULL,
    answer      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (couple_id, slug, user_id)
);

-- Die Uebersicht fragt: welche Impulse hat dieses Paar schon gemacht?
CREATE INDEX IF NOT EXISTS idx_couple_impulses_raum
    ON couple_impulse_runs (couple_id, created_at DESC);

-- zz_122_gefuehlsbild_zwei_ebenen.sql
-- Das Gefuehlsbild gibt es kuenftig zweimal: am Fall und im Kompass.
--
--                      Am Fall                        Im Kompass
--   Frage              Wie geht es mir mit dieser      Wie geht es mir ueberhaupt?
--                      Person?
--   Liegt bei          dem Fall                       mir
--   Fachperson sieht   wenn freigegeben, ueber        nur mit eigener Freigabe
--                      diesen Fall
--   Verschwindet       wenn der Fall geloescht wird   erst mit dem Konto
--
-- EIN WERKZEUG, NICHT ZWEI
-- Die naheliegende Loesung waere eine zweite Tabelle gewesen. Dann gaebe es zwei
-- Kataloge, zwei Dienste, zwei Oberflaechen - und beim naechsten Wort im Wortfeld zwei
-- Stellen, von denen man eine vergisst. Stattdessen wird case_id NULL-bar: NULL heisst
-- "gehoert zur Person".
--
-- WARUM DAS VON SELBST DICHT IST
-- Jede bestehende Abfrage filtert ueber `case_id = $1`. In SQL ist `NULL = <irgendwas>`
-- niemals wahr - ein persoenliches Bild kann also durch keine Fall-Abfrage rutschen,
-- auch nicht durch die der Fachperson. Das ist keine Sorgfalt, das ist die Semantik.
-- Wer die Person-Ebene lesen will, muss `IS NOT DISTINCT FROM` schreiben und tut das
-- damit absichtlich.
--
-- DER EINDEUTIGE INDEX BRAUCHT EINE ZWEITE FASSUNG
-- idx_feeling_snapshots_ein_entwurf erzwingt "hoechstens ein Entwurf je Fall" ueber
-- (case_id). In einem eindeutigen Index sind zwei NULL-Werte VERSCHIEDEN - ohne den
-- zweiten Index unten koennte also jede Person beliebig viele persoenliche Entwuerfe
-- anlegen, und beim naechsten Aufruf wuesste niemand, welcher gemeint ist.
--
-- Additiv, idempotent. Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_122_gefuehlsbild_zwei_ebenen.sql

-- ── 1) Die Spalte wird NULL-bar ─────────────────────────────────────────────
ALTER TABLE feeling_snapshots ALTER COLUMN case_id DROP NOT NULL;

COMMENT ON COLUMN feeling_snapshots.case_id IS
    'NULL = gehoert zur Person (Kompass), nicht zu einem Fall. Fall-Abfragen filtern '
    'ueber case_id = $1 und koennen solche Zeilen deshalb nie sehen.';

-- ── 2) Auch auf der Person-Ebene nur EIN Entwurf ────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_feeling_snapshots_ein_eigener_entwurf
    ON feeling_snapshots (user_id)
    WHERE status = 'entwurf' AND case_id IS NULL;

-- ── 3) Den eigenen Verlauf lesen ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_feeling_snapshots_eigene
    ON feeling_snapshots (user_id, bestaetigt_at DESC)
    WHERE case_id IS NULL;

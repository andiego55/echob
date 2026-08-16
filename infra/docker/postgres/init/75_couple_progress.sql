-- 75_couple_progress.sql
-- Paartherapie Phase 8: Punkte, Meilensteine, Fortschritt.
--
-- Bewusst KOOPERATIV statt kompetitiv: Es gibt eigene Punkte je Person UND gemeinsame
-- Punkte des Paares, aber keine Rangliste und keinen Gewinner. In einer Beziehung wäre ein
-- Wettbewerb zwischen den Partnern genau das Falsche — belohnt wird Beteiligung, nicht
-- Überlegenheit. Die höchste Punktzahl gibt es fürs Einhalten einer Abmachung.
--
-- Ereignisse werden nur protokolliert; Summen, Streak und Meilensteine leitet
-- couple_progress_service daraus ab (keine doppelte Wahrheit in der DB).
--
-- Idempotent (CREATE TABLE / INDEX IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS couple_point_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id  UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    -- Wer die Handlung ausgelöst hat.
    user_id    UUID NOT NULL,
    -- Ereignisart aus der Registry in couple_progress_service.POINTS.
    kind       TEXT NOT NULL,
    points     INTEGER NOT NULL DEFAULT 0,
    -- Bezug (Sitzung, Abmachung, Test-Slug …) — verhindert Mehrfachvergabe.
    ref_id     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dieselbe Handlung zaehlt genau einmal. Nur fuer Ereignisse mit Bezug.
CREATE UNIQUE INDEX IF NOT EXISTS uq_couple_point_events_ref
    ON couple_point_events (couple_id, user_id, kind, ref_id)
    WHERE ref_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_couple_point_events_couple
    ON couple_point_events (couple_id, created_at DESC);

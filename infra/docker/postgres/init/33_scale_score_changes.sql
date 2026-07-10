-- ── Änderungs-Log für Skalenwerte (Vorher/Nachher im Fall-Verlauf) ───────────
-- scale_scores wird bei jeder Neuberechnung ersetzt (DELETE+INSERT) → der alte
-- Wert geht verloren. Diese Tabelle hält je Neuberechnung fest, wie sich ein
-- Skalenwert verändert hat (alt→neu). Erfasst NUR Änderungen ab Einbau
-- (nicht rückwirkend). Wird von der Fall-Historie der Fachperson gelesen.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS). Manuell einspielen:
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/33_scale_score_changes.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/33_scale_score_changes.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scale_score_changes (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id    UUID        NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    scale_key  TEXT        NOT NULL,
    old_score  NUMERIC(4,2),                       -- NULL = erstmals ermittelt
    new_score  NUMERIC(4,2) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scale_score_changes_case
    ON scale_score_changes (case_id, changed_at DESC);

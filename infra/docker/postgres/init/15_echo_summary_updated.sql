-- 15_echo_summary_updated.sql
-- Profi-Echo-Zusammenfassungen werden editierbar → Änderungszeitpunkt festhalten.
-- Bestand: updated_at = created_at (noch nicht bearbeitet). Idempotent.
ALTER TABLE professional_echo_summaries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE professional_echo_summaries SET updated_at = created_at WHERE updated_at IS NULL;

-- Migration 57: Marktplatz-Herkunft — merkt sich, aus welchem Angebot ein Modul
-- übernommen wurde. Ermöglicht „bereits übernommen"-Anzeige + Doppel-Übernahme-Schutz.
-- Additiv, nullable, FK mit SET NULL (Quelle darf gelöscht werden).
--
-- Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/57_module_provenance.sql

ALTER TABLE learning_modules
    ADD COLUMN IF NOT EXISTS source_module_id UUID REFERENCES learning_modules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_learning_modules_source ON learning_modules (source_module_id);

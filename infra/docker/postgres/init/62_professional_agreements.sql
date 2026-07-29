-- Migration 62: Vertragsnachweise der Fachperson (DSGVO Art. 28 — Auftragsverarbeitung).
--
-- Bevor eine Fachperson (Verantwortliche) mit EchoB (Auftragsverarbeiter) freigegebene
-- Klient-Daten verarbeitet, muss der Auftragsverarbeitungsvertrag (AVV) geschlossen sein.
-- Diese Tabelle haelt append-only fest, welche Fachperson welche Version welchen Vertrags
-- wann akzeptiert hat (= Abschluss-Nachweis). Nie updaten/loeschen: jede Zustimmung ist
-- eine eigene Zeile; die juengste je (user_id, kind) gilt.
--
-- Additiv, idempotent. Manuell einspielen (VOR dem api-Rebuild):
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/62_professional_agreements.sql

CREATE TABLE IF NOT EXISTS professional_agreements (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_user_id UUID NOT NULL,                 -- Supabase auth.users.id der Fachperson
    kind                 TEXT NOT NULL DEFAULT 'avv'     -- Vertragsart (aktuell nur AVV, Art. 28)
                         CHECK (kind IN ('avv')),
    version              TEXT NOT NULL,                  -- akzeptierte Vertragsversion, z. B. 'avv-2026-07'
    accepted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Beleg-Metadaten (best effort, fuer den Nachweis)
    user_agent           TEXT,
    ip_address           TEXT
);

-- Schnelles Nachschlagen der juengsten Zustimmung je Fachperson/Art.
CREATE INDEX IF NOT EXISTS idx_professional_agreements_lookup
    ON professional_agreements (professional_user_id, kind, accepted_at DESC);

-- 69_couple_links.sql
-- Paartherapie (Peer-zu-Peer) — Fundament: Kopplung zweier Nutzer:innen zu einem Paarraum.
--
-- ISOLATIONSPRINZIP (nicht verhandelbar):
--   Ein couple_link ist KEINE Freigabe. Er gewährt der anderen Person KEINEN Zugriff auf den
--   eigenen Fall, keine Szenen, keine Skalen, keine Berichte, kein privates Echo. Er ist
--   ausschließlich der Türöffner zum gemeinsamen Paarraum. Der Echo-Kontext im Paarraum wird
--   in den Folgephasen ausnahmslos vom Nutzer EXPLIZIT zusammengestellt (kein Fall-Leak) —
--   analog zum sharing_service-Flaschenhals, aber bewusst OHNE load_shared_bundle.
--
--   Der Anker-Fall (initiator_case_id / partner_case_id) dokumentiert nur die HERKUNFT der
--   Einladung und dient später als Quelle für den (manuell freigegebenen) Kontext-Entwurf.
--   Er begründet niemals einen Datenzugriff der jeweils anderen Person.
--
-- Idempotent (CREATE TABLE / INDEX IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS couple_links (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Niedrigschwelliger Kopplungscode; direkt eingebbar oder per Mail teilbar.
    invite_code        TEXT UNIQUE,
    -- Wer die Kopplung angestoßen hat (Account-UUID).
    initiator_user_id  UUID NOT NULL,
    -- Anker-Fall der einladenden Person — NUR Herkunft/Bezug, KEIN Datenzugriff.
    initiator_case_id  UUID,
    -- Die andere Person; NULL bis zur Annahme.
    partner_user_id    UUID,
    -- Optionaler Anker-Fall der annehmenden Person (kann später gesetzt werden).
    partner_case_id    UUID,
    -- Lebenszyklus: pending -> active (angenommen) -> ended (von einer Seite beendet).
    status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'active', 'ended')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at        TIMESTAMPTZ,
    ended_at           TIMESTAMPTZ,
    ended_by           UUID
);

-- Paarräume einer Person schnell finden (als Initiator ODER Partner), Beendete ausgeklammert.
CREATE INDEX IF NOT EXISTS idx_couple_links_initiator
    ON couple_links (initiator_user_id) WHERE status <> 'ended';
CREATE INDEX IF NOT EXISTS idx_couple_links_partner
    ON couple_links (partner_user_id) WHERE status <> 'ended';
-- Offenen Einladungscode einlösen.
CREATE INDEX IF NOT EXISTS idx_couple_links_invite_code
    ON couple_links (invite_code) WHERE status = 'pending';

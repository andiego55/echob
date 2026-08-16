-- 72_couple_agreements.sql
-- Paartherapie Phase 6: Sitzungs-Zusammenfassungen + Abmachungen.
--
-- Zusammenfassung: Echo fasst eine gemeinsame Sitzung zusammen; sie gehört BEIDEN und ist
-- im Paarraum für beide sichtbar (sie entsteht ausschließlich aus dem gemeinsamen Verlauf
-- und den bestätigten Kontexten — nie aus Fall- oder Privatdialog-Inhalten).
--
-- Abmachungen: das Ergebnis, das bleibt. Eine Person schlägt vor, die andere nimmt an —
-- erst dann gilt eine Abmachung (status 'active'). Danach lässt sich festhalten, ob sie
-- gehalten hat. Abmachungen hängen am Paarraum, nicht an einer einzelnen Sitzung, damit sie
-- eine Sitzung überdauern; die Herkunfts-Sitzung wird nur dokumentiert.
--
-- Idempotent (CREATE TABLE / INDEX IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS couple_session_summaries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID NOT NULL REFERENCES couple_sessions(id) ON DELETE CASCADE,
    created_by   UUID NOT NULL,
    summary_text TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_session_summaries_session
    ON couple_session_summaries (session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS couple_agreements (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id    UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    -- Aus welcher Sitzung sie stammt (nur Herkunft; die Abmachung überdauert die Sitzung).
    session_id   UUID REFERENCES couple_sessions(id) ON DELETE SET NULL,
    -- Der Text der Abmachung (feldverschlüsselt).
    body         TEXT NOT NULL,
    proposed_by  UUID NOT NULL,
    accepted_by  UUID,
    accepted_at  TIMESTAMPTZ,
    -- proposed = wartet auf Zustimmung, active = gilt, kept = hat gehalten,
    -- dropped = verworfen oder zurückgezogen.
    status       TEXT NOT NULL DEFAULT 'proposed'
                 CHECK (status IN ('proposed', 'active', 'kept', 'dropped')),
    -- Optionaler Zeitpunkt, bis wann bzw. wann wir noch mal draufschauen.
    due_at       TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_agreements_couple
    ON couple_agreements (couple_id, created_at DESC);

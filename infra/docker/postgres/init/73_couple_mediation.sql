-- 73_couple_mediation.sql
-- Paartherapie Phase 5: AI-Mediation nach dem Caucus-Modell.
--
-- Zu einem Thema hinterlegt jede Person ZWEI Beiträge:
--   * open_text    – offen, der anderen Person zugeordnet sichtbar.
--   * private_text – vertraulich. NUR Echo liest ihn. Die andere Person bekommt ihn
--                    nirgends zu sehen, auch nicht unzugeordnet (Nutzer-Entscheidung
--                    2026-08-16: „Nur Echo sieht sie (Caucus)").
--
-- Echo erarbeitet daraus einen Lösungsvorschlag, den BEIDE lesen. Der vertrauliche Beitrag
-- wirkt dabei als Hintergrund — er darf im Vorschlag nicht zitiert oder zuordenbar
-- wiedergegeben werden (Prompt-Direktive + strukturierte Ausgabe). Serverseitig ist
-- zusätzlich sichergestellt, dass kein Endpunkt private_text einer anderen Person ausliefert.
--
-- Idempotent (CREATE TABLE / INDEX IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS couple_topics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id   UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    created_by  UUID NOT NULL,
    title       TEXT NOT NULL,
    -- Worum es geht, in den Worten der anlegenden Person (feldverschlüsselt).
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'resolved')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_topics_couple
    ON couple_topics (couple_id, created_at DESC);

CREATE TABLE IF NOT EXISTS couple_perspectives (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id     UUID NOT NULL REFERENCES couple_topics(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL,
    -- Offen: beide sehen ihn, mit Namen (feldverschlüsselt).
    open_text    TEXT,
    -- Vertraulich: ausschließlich Echo und die verfassende Person (feldverschlüsselt).
    private_text TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (topic_id, user_id)
);

CREATE TABLE IF NOT EXISTS couple_mediations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id   UUID NOT NULL REFERENCES couple_topics(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    -- Der Lösungsvorschlag — beide lesen ihn (feldverschlüsselt).
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_mediations_topic
    ON couple_mediations (topic_id, created_at DESC);

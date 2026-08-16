-- 74_couple_tests.sql
-- Paartherapie Phase 7: Tests, die beide ausfüllen und vergleichen.
--
-- Eigene Erhebung IM PAARRAUM — bewusst getrennt von den privaten Testergebnissen eines
-- Falls (test_results). Was hier steht, hat die Person ausdrücklich für den Paarraum
-- ausgefüllt; nichts aus dem eigenen Fall wandert automatisch herüber.
--
-- Blindheitsregel: Das Ergebnis der anderen Person wird erst sichtbar, wenn man selbst
-- geantwortet hat (durchgesetzt in couple_test_service.load_runs) — sonst färbt es ab.
--
-- Idempotent (CREATE TABLE / INDEX IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS couple_test_runs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id  UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    -- Slug des Selbsttests (Registry liegt im Frontend).
    slug       TEXT NOT NULL,
    title      TEXT NOT NULL,
    -- Antworten und deterministisch berechnetes Ergebnis (Freitext-Blätter verschlüsselt).
    answers    JSONB NOT NULL DEFAULT '{}'::jsonb,
    result     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (couple_id, user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_couple_test_runs_couple
    ON couple_test_runs (couple_id, slug);

-- Echos allparteiliger Kommentar zum Vergleich (beide lesen ihn).
CREATE TABLE IF NOT EXISTS couple_test_comparisons (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id  UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    slug       TEXT NOT NULL,
    created_by UUID NOT NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_test_comparisons_couple
    ON couple_test_comparisons (couple_id, slug, created_at DESC);

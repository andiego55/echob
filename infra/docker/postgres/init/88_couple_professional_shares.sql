-- 88_couple_professional_shares.sql
-- Paartherapie: die Freigabe eines Paarraums an eine Fachperson.
--
-- Zum ersten Mal verlaesst Material den Paarraum. Alles im Modul ist bisher darauf gebaut,
-- dass nichts hinausgeht - diese Tabelle durchbricht das absichtlich und mit Nutzen.
-- Deshalb steckt hier eine Regel drin, die es beim Fall-Teilen nicht gibt:
--
--   EIN FALL GEHOERT EINER PERSON. EIN PAARRAUM GEHOERT ZWEIEN.
--
-- In den Verlaeufen, Themen und Abmachungen steckt, was BEIDE beigetragen haben. Gaebe
-- eine Person den Raum allein frei, landeten die Beitraege der anderen bei jemandem, den
-- sie nie gewaehlt hat. Deshalb:
--
--   * FREIGEBEN BRAUCHT BEIDE  -> darum die eigene Tabelle couple_share_consents.
--     Erst wenn beide Mitglieder eine Zeile darin haben, wird die Freigabe aktiv.
--   * WIDERRUFEN GENUEGT EINER -> revoked_by ist eine einzelne Person, keine zweite Frage.
--
-- Die Zustimmung als eigene Tabelle statt als zwei Spalten hat einen zweiten Grund: Der
-- Weg funktioniert dann gleich, egal ob eine Person vorschlaegt (ihr Vorschlag IST ihre
-- Zustimmung) oder die Fachperson darum bittet (dann fehlen noch beide).
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS couple_professional_shares (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id            UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    professional_user_id UUID NOT NULL,
    -- pending = es fehlt mindestens eine Zustimmung.
    status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'active', 'revoked')),
    -- Woher der Anstoss kam. 'professional' = die Fachperson hat gebeten; sie darf bitten,
    -- aber nichts entscheiden - beide Zustimmungen fehlen dann noch.
    origin               TEXT NOT NULL DEFAULT 'partner'
                         CHECK (origin IN ('partner', 'professional')),
    initiated_by         UUID,
    -- Optionale Nachricht an das Paar bzw. an die Fachperson (feldverschluesselt).
    message              TEXT,
    revoked_by           UUID,
    revoked_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hoechstens eine offene oder aktive Freigabe je Paar und Fachperson. Widerrufene duerfen
-- liegen bleiben - sie sind der Nachweis, dass es sie einmal gab.
CREATE UNIQUE INDEX IF NOT EXISTS idx_couple_prof_shares_offen
    ON couple_professional_shares (couple_id, professional_user_id)
    WHERE status IN ('pending', 'active');

CREATE INDEX IF NOT EXISTS idx_couple_prof_shares_prof
    ON couple_professional_shares (professional_user_id, status);

-- ── Die Zustimmungen ────────────────────────────────────────────────────────
-- Eine Zeile je Person, die zugestimmt hat. Zwei Zeilen = die Freigabe darf aktiv werden.
CREATE TABLE IF NOT EXISTS couple_share_consents (
    share_id     UUID NOT NULL REFERENCES couple_professional_shares(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL,
    consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (share_id, user_id)
);

-- ── Der Umfang ──────────────────────────────────────────────────────────────
-- Element-genau wie beim Fall-Teilen (case_share_elements), damit es nur EIN Muster im
-- Haus gibt. Die erlaubten Werte stehen in der Anwendung
-- (couple_professional_service.ELEMENTS) und nicht als CHECK - ein neues Element soll
-- keine Migration kosten.
CREATE TABLE IF NOT EXISTS couple_share_elements (
    share_id     UUID NOT NULL REFERENCES couple_professional_shares(id) ON DELETE CASCADE,
    element_type TEXT NOT NULL,
    PRIMARY KEY (share_id, element_type)
);

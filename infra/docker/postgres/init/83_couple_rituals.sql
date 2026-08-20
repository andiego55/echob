-- 83_couple_rituals.sql
-- Paartherapie: die beiden wiederkehrenden Anlaesse an den Raendern des Alltags.
--
--   1. WERTSCHAETZUNG. Sie lag bisher nur in Schritt 2 der Sitzungsvorbereitung - man kam
--      also nur daran, wenn ohnehin ein Gespraech anstand. Damit fiel sie genau dann aus,
--      wenn sie am meisten traegt: zwischendurch. Jetzt ein eigener kleiner Anlass, den
--      man in zwanzig Sekunden erledigt.
--
--      Bewusst OHNE die Blindheitsregel des Check-ins: Wertschaetzung ist ein Geschenk,
--      kein Vergleich. Sie geht sofort hinueber, auch wenn die andere Person nichts
--      zurueckschreibt.
--
--   2. STREIT-EINSTIEG. Der haeufigste Moment, in dem so etwas geoeffnet wird, ist nicht
--      "ich moechte ein Thema anlegen", sondern "wir haben uns gerade gestritten". Dafuer
--      braucht es keinen zweiten Chat-Mechanismus - der Begleiter kann das schon. Es fehlt
--      nur die Unterscheidung, WELCHE Art Gespraech ein Faden ist, damit Echo im richtigen
--      Ton antwortet.
--
-- Beides bleibt im Paarbereich: eine eigene Tabelle, eine Spalte an einer couple_*-Tabelle.
--
-- Idempotent.

-- ── Wertschaetzung ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS couple_appreciations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id    UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    -- Wer sie dagelassen hat. Empfaenger:in ist immer die jeweils andere Person.
    from_user_id UUID NOT NULL,
    -- Der Satz selbst (feldverschluesselt).
    body         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Gesetzt, sobald die Empfaengerin sie gesehen hat - nur fuer den Hinweis "neu".
    seen_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_couple_appreciations_room
    ON couple_appreciations (couple_id, created_at DESC);

-- ── Art eines Begleiter-Fadens ──────────────────────────────────────────────
-- 'chat' = der gewohnte offene Faden, 'deescalation' = nach einem Streit.
-- Die Art entscheidet ueber den Prompt; die Liste der erlaubten Werte steht bewusst in
-- der Anwendung (couple_companion_service.THREAD_KINDS) und nicht als CHECK-Constraint -
-- sonst kostet jede neue Art eine Migration (siehe echo_messages.thread_type).
ALTER TABLE couple_echo_threads
    ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'chat';

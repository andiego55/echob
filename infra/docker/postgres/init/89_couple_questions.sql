-- 89_couple_questions.sql
-- Paartherapie: die offene Frage an die Partnerperson.
--
-- WARUM ES DAS BRAUCHT. Der Paarraum konnte bisher alles ausser dem Einfachsten: etwas
-- fragen. Echo konnte man alles fragen. Die andere Person erreichte man nur ueber vier
-- schwere oder enge Wege - eine moderierte Sitzung, eine Mediation, den festen
-- Wochen-Check-in oder die Wertschaetzungswand (die geht nur in eine Richtung und nur ins
-- Positive). Fuer "Warum war dir der Abend bei deinen Eltern so wichtig?" gab es nichts.
--
-- Das ist die leichteste Bewegung im Raum: keine Moderation, kein Termin, keine Zusage.
-- Eine Frage liegen lassen, eine Antwort finden, wenn man wiederkommt.
--
-- BEWUSSTE ENTSCHEIDUNGEN:
--
--   * Frage und Antwort verschluesselt (Fernet, wie ueberall im Paarraum).
--   * Genau EINE Antwort je Frage. Ein Faden daraus waere ein Chat - und einen ungefilterten
--     Chat will dieses Modul ausdruecklich nicht: Zuspitzung ohne Moderation ist genau das,
--     was Paare in der Krise nicht noch mehr brauchen. Wer weiterreden will, macht ein
--     Gespraech daraus (dafuer gibt es den Weiterfuehren-Block).
--   * `status` statt Loeschen: beantwortet oder zurueckgezogen. Wer eine Frage bereut, soll
--     sie zurueckziehen koennen, ohne dass die andere Person Loecher in der Liste sieht.
--   * Kein Bezug zu Faellen, Szenen oder sonst etwas ausserhalb des Paarraums.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS couple_questions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id     UUID NOT NULL REFERENCES couple_links(id) ON DELETE CASCADE,
    -- Wer gefragt hat. Die andere Person des Raums ist damit die gefragte - der Raum hat
    -- genau zwei Mitglieder, eine eigene Empfaengerspalte waere eine zweite Wahrheit.
    asked_by      UUID NOT NULL,
    question      TEXT NOT NULL,
    answer        TEXT,
    answered_at   TIMESTAMPTZ,
    -- open | answered | withdrawn
    status        TEXT NOT NULL DEFAULT 'open',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Die Uebersicht fragt genau das ab: alle Fragen eines Raums, neueste zuerst.
CREATE INDEX IF NOT EXISTS idx_couple_questions_raum
    ON couple_questions (couple_id, created_at DESC);

-- Das Dashboard fragt nach offenen Fragen - haeufig und pro Aufruf.
CREATE INDEX IF NOT EXISTS idx_couple_questions_offen
    ON couple_questions (couple_id)
    WHERE status = 'open';

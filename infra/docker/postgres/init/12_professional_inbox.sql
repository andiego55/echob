-- 12: Profi-Postfach — Lese-Tracking je Zuweisung (gelesen/ungelesen).
-- Idempotent; nach Merge manuell auf Dev UND Prod einspielen (vgl. 09).

ALTER TABLE professional_assignments
  ADD COLUMN IF NOT EXISTS pro_read_at TIMESTAMPTZ;

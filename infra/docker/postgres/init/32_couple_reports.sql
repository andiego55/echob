-- 32_couple_reports.sql — Paar-Analyse-Berichte + 3 weitere Glossar-Begriffe.
--
-- Berichte der Paar-Analyse hängen an der KOPPLUNG (nicht am Einzelfall): Wird die
-- Kopplung aufgelöst (DELETE case_couples), verschwinden Dialoge (bereits via
-- professional_couple_echo_*) UND Berichte automatisch mit (ON DELETE CASCADE).
--
-- Idempotent. Manuell einspielen:
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/32_couple_reports.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/32_couple_reports.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS professional_couple_reports (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id            UUID NOT NULL REFERENCES case_couples (id) ON DELETE CASCADE,
    professional_user_id UUID NOT NULL,
    source               TEXT NOT NULL,                        -- 'standard:couple' | 'template'
    template_id          UUID REFERENCES professional_report_templates (id) ON DELETE SET NULL,
    title                TEXT,
    content              JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {sections:[{heading,text}]}, verschlüsselt
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_couple_reports_couple
    ON professional_couple_reports (couple_id, created_at DESC);

-- ── Glossar-Paaranalyse: 3 weitere Begriffe (slug-Präfix paar_; idempotent) ───
INSERT INTO glossary_terms (slug, term, definition, sort_order) VALUES
  ('paar_reparaturversuche', 'Reparaturversuche',
   'Gesten oder Worte, die eine drohende Eskalation abmildern – Humor, Entschuldigung, Zuwendung, ein Themenwechsel. Ob sie wirken, hängt oft weniger vom Versuch selbst ab als davon, ob das Gegenüber ihn im Moment annehmen kann.', 58),
  ('paar_zirkulaere_fragen', 'Zirkuläre Fragen',
   'Fragen, die Wechselwirkungen und Unterschiede sichtbar machen (z. B. „Wie reagiert die eine Person, wenn die andere sich zurückzieht?"). Sie beleuchten das Muster zwischen beiden statt Eigenschaften einer einzelnen Person.', 59),
  ('paar_bindungsbeduerfnisse', 'Bindungsbedürfnisse',
   'Hinter Vorwürfen, Rückzug oder Kontrolle liegen häufig unerfüllte Bindungsbedürfnisse – nach Nähe, Sicherheit, Verlässlichkeit oder Gesehenwerden. Sie zu benennen verschiebt den Fokus von Schuld hin zum zugrunde liegenden Bedürfnis.', 60)
ON CONFLICT (slug) DO NOTHING;

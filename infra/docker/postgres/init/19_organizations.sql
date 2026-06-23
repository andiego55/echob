-- ── Organisationen / Praxen (Vertrieb Phase 2) ───────────────────────────────
-- Jeder Profi-Account gehört zu genau einer Organisation (Solo = 1-Mitglied-Org).
-- Fundament für Mitglieder/Rollen, praxisweite Vorlagen und (Phase 3) Abrechnung.
-- Fall-Zugriff bleibt UNVERÄNDERT an case_shares.professional_user_id gebunden
-- (least-access) — die Org-Schicht liegt daneben.
--
-- Idempotent (CREATE TABLE IF NOT EXISTS / NOT EXISTS-Backfill). Manuell einspielen:
--   Dev:  docker compose exec postgres psql -U echob_dev -d echob -f /docker-entrypoint-initdb.d/19_organizations.sql
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/19_organizations.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) Organisation / Praxis ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL DEFAULT 'Meine Praxis',
    owner_user_id UUID NOT NULL,                          -- Gründer:in (Profi)
    plan          TEXT NOT NULL DEFAULT 'free',           -- Platzhalter bis Phase 3 (Billing)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations (owner_user_id);

-- ── 2) Mitglieder ────────────────────────────────────────────────────────────
-- UNIQUE(professional_user_id): genau eine Org je Fachperson.
CREATE TABLE IF NOT EXISTS organization_members (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id               UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    professional_user_id UUID NOT NULL UNIQUE,
    role                 TEXT NOT NULL DEFAULT 'member'
                         CHECK (role IN ('owner', 'admin', 'member')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members (org_id);

-- ── 3) Mitglieds-Einladungen (Profi → Profi, org-scoped) ─────────────────────
CREATE TABLE IF NOT EXISTS organization_invites (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id             UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    email              TEXT NOT NULL,                      -- immer lowercased
    invited_by_user_id UUID NOT NULL,
    status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'accepted')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at        TIMESTAMPTZ,
    UNIQUE (org_id, email)
);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites (email);

-- ── 4) Vorlagen werden org-gebunden (praxisweit geteilt) ─────────────────────
ALTER TABLE professional_report_templates ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE professional_note_templates   ADD COLUMN IF NOT EXISTS org_id UUID;

-- ── 5) Backfill: je bestehender Fachperson eine Solo-Org + Owner-Mitgliedschaft ─
-- (a) Org je Profi ohne Mitgliedschaft.
INSERT INTO organizations (name, owner_user_id)
SELECT COALESCE(NULLIF(p.display_name, ''), 'Meine Praxis'), p.user_id
FROM professional_profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM organization_members m WHERE m.professional_user_id = p.user_id
);

-- (b) Owner-Mitgliedschaft je Org, deren Owner noch keine Mitgliedschaft hat.
INSERT INTO organization_members (org_id, professional_user_id, role)
SELECT o.id, o.owner_user_id, 'owner'
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM organization_members m WHERE m.professional_user_id = o.owner_user_id
);

-- (c) Vorlagen-org_id aus der Org des bisherigen Eigentümers setzen.
UPDATE professional_report_templates t
SET org_id = m.org_id
FROM organization_members m
WHERE m.professional_user_id = t.professional_user_id AND t.org_id IS NULL;

UPDATE professional_note_templates t
SET org_id = m.org_id
FROM organization_members m
WHERE m.professional_user_id = t.professional_user_id AND t.org_id IS NULL;

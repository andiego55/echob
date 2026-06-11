-- ── Zahlungen / Stripe-Integration ───────────────────────────────────────────
-- Erweitert user_profiles um Stripe-Verknüpfung und Startpaket-Plan,
-- legt eine Payments-Audit-Tabelle an.

-- Plan-Constraint um 'startpaket' erweitern
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_plan_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_plan_check
    CHECK (plan IN ('trial', 'startpaket', 'early_bird', 'regular', 'annual'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer
    ON user_profiles (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription
    ON user_profiles (stripe_subscription_id);

-- Audit-Log aller Zahlungen (Webhook-Idempotenz über stripe_session_id UNIQUE)
CREATE TABLE IF NOT EXISTS payments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL,
    product            TEXT NOT NULL,
    stripe_session_id  TEXT UNIQUE,
    stripe_customer_id TEXT,
    amount_cents       INTEGER,
    currency           TEXT,
    status             TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);

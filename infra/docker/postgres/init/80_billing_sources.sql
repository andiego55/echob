-- 80_billing_sources.sql
-- Billing: die Berechtigung loest sich vom Zahlungsanbieter.
--
-- Der Zugang haengt schon heute nur an user_profiles.plan + subscription_ends_at;
-- Stripe schreibt dort lediglich hinein. Diese Migration macht sichtbar, WER
-- hineingeschrieben hat - damit neben Stripe auch Google Play, eine Rechnung, eine
-- Ueberweisung oder ein Wiederverkaeufer moeglich sind.
--
-- BEWUSST OHNE CHECK-Constraint auf die Quelle: Die gueltigen Werte stehen als Registry
-- im Code (billing_entitlement.PROVIDERS). Ein neuer Zahlungsweg kostet damit keine
-- Migration - dieselbe Entscheidung wie bei den Assignment-Typen, und sie umgeht das
-- CHECK-Constraint-Problem, das uns bei echo_messages.thread_type schon eingeholt hat.
--
-- Idempotent.

-- ── Wer haelt die aktuelle Berechtigung? ─────────────────────────────────────
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_source      TEXT;
-- Kennung beim jeweiligen Anbieter (Stripe-Subscription, Play-Purchase-Token,
-- Rechnungsnummer ...). Bewusst generisch statt pro Anbieter eine eigene Spalte.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_external_id TEXT;
-- Freitext fuer Wege ohne Anbieter (z. B. "Rechnung 2026-014, per Ueberweisung").
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS billing_note        TEXT;

-- Bestand: Wer eine Stripe-Subscription hat, kam ueber Stripe.
UPDATE user_profiles
   SET billing_source = 'stripe',
       billing_external_id = COALESCE(billing_external_id, stripe_subscription_id)
 WHERE billing_source IS NULL
   AND (stripe_subscription_id IS NOT NULL OR stripe_customer_id IS NOT NULL);

-- ── Zahlungen anbieterneutral protokollieren ─────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider    TEXT NOT NULL DEFAULT 'stripe';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Bestand: die Stripe-Session ist die externe Kennung.
UPDATE payments SET external_id = stripe_session_id
 WHERE external_id IS NULL AND stripe_session_id IS NOT NULL;

-- Doppelbuchung verhindern - je Anbieter zaehlt dieselbe Kennung genau einmal.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_external
    ON payments (provider, external_id) WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_billing_source
    ON user_profiles (billing_source) WHERE billing_source IS NOT NULL;

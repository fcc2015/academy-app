-- ============================================================
-- SaaS Platform Database Migrations
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. Add plan/subscription columns to academies table
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create SaaS settings table (singleton)
CREATE TABLE IF NOT EXISTS saas_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform_name TEXT DEFAULT 'Academy SaaS Platform',
    support_email TEXT DEFAULT 'support@academy.com',
    default_trial_days INTEGER DEFAULT 14,
    max_players_starter INTEGER DEFAULT 50,
    max_players_pro INTEGER DEFAULT 200,
    max_coaches_starter INTEGER DEFAULT 2,
    max_coaches_pro INTEGER DEFAULT 10,
    auto_provision BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    auto_backup BOOLEAN DEFAULT TRUE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    paypal_sandbox BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create payment transactions table for PayPal
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paypal_order_id TEXT UNIQUE,
    paypal_capture_id TEXT,
    academy_id UUID REFERENCES academies(id),
    plan_id TEXT,
    amount NUMERIC(10, 2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',  -- pending, completed, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. Disable RLS on new tables (service_role handles auth)
ALTER TABLE saas_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access
CREATE POLICY "service_role_saas_settings" ON saas_settings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_payment_transactions" ON payment_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Insert default settings row
INSERT INTO saas_settings (platform_name) VALUES ('Academy SaaS Platform')
ON CONFLICT DO NOTHING;

-- Done! ✅
SELECT 'Migration completed successfully' AS result;

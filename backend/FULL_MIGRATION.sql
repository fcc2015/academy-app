-- ============================================================
-- FULL MIGRATION — نسخ وحط فـ Supabase SQL Editor
-- Run once — كل شيء مع IF NOT EXISTS (آمن تعيد تشغيلو)
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. TABLE: payment_transactions
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    paypal_order_id     text,
    paypal_capture_id   text,
    academy_id          uuid REFERENCES public.academies(id) ON DELETE SET NULL,
    plan_id             text,
    amount              numeric DEFAULT 0,
    currency            text DEFAULT 'USD',
    status              text DEFAULT 'pending',
    billing_cycle_type  text DEFAULT 'monthly',
    created_at          timestamptz DEFAULT now(),
    completed_at        timestamptz
);

-- RLS للـ payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'payment_transactions'
        AND policyname = 'Allow all for service role'
    ) THEN
        CREATE POLICY "Allow all for service role"
        ON public.payment_transactions
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- أضف billing_cycle_type إذا ما كانتش موجودة (للي عندهم الجدول قديم)
ALTER TABLE public.payment_transactions
    ADD COLUMN IF NOT EXISTS billing_cycle_type text DEFAULT 'monthly';


-- ════════════════════════════════════════════════════════════
-- 2. TABLE: saas_settings
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.saas_settings (
    id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    platform_name           text DEFAULT 'Academy SaaS Platform',
    support_email           text DEFAULT 'support@academy.com',
    default_trial_days      integer DEFAULT 14,
    max_players_starter     integer DEFAULT 50,
    max_players_pro         integer DEFAULT 200,
    max_coaches_starter     integer DEFAULT 2,
    max_coaches_pro         integer DEFAULT 10,
    auto_provision          boolean DEFAULT true,
    email_notifications     boolean DEFAULT true,
    auto_backup             boolean DEFAULT true,
    maintenance_mode        boolean DEFAULT false,
    paypal_sandbox          boolean DEFAULT true,
    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);

ALTER TABLE public.saas_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'saas_settings'
        AND policyname = 'Allow all for service role'
    ) THEN
        CREATE POLICY "Allow all for service role"
        ON public.saas_settings
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;


-- ════════════════════════════════════════════════════════════
-- 3. COLUMNS: academies — كل الأعمدة اللي كيكتب فيها الكود
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.academies
    ADD COLUMN IF NOT EXISTS plan_id                text,
    ADD COLUMN IF NOT EXISTS subscription_status    text DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS last_payment_at        timestamptz,
    ADD COLUMN IF NOT EXISTS billing_cycle_start    timestamptz,
    ADD COLUMN IF NOT EXISTS billing_cycle_end      timestamptz,
    ADD COLUMN IF NOT EXISTS billing_cycle_type     text DEFAULT 'monthly',
    ADD COLUMN IF NOT EXISTS grace_period_end       timestamptz,
    ADD COLUMN IF NOT EXISTS domain_status          text,
    ADD COLUMN IF NOT EXISTS custom_domain          text,
    ADD COLUMN IF NOT EXISTS country                text,
    ADD COLUMN IF NOT EXISTS logo_url               text,
    ADD COLUMN IF NOT EXISTS primary_color          text DEFAULT '#6366f1',
    ADD COLUMN IF NOT EXISTS secondary_color        text DEFAULT '#8b5cf6';


-- ════════════════════════════════════════════════════════════
-- 4. TABLE: parent_signup_requests
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.parent_signup_requests (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_user_id  uuid,
    child_name      text,
    academy_id      uuid,
    status          text DEFAULT 'pending',
    created_at      timestamptz DEFAULT now()
);


-- ════════════════════════════════════════════════════════════
-- ✅ تحقق — شوف الأعمدة ديال academies
-- ════════════════════════════════════════════════════════════
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'academies'
  AND table_schema = 'public'
  AND column_name IN (
    'plan_id','subscription_status','last_payment_at',
    'billing_cycle_start','billing_cycle_end','billing_cycle_type',
    'grace_period_end','domain_status','custom_domain','country',
    'logo_url','primary_color','secondary_color'
  )
ORDER BY column_name;

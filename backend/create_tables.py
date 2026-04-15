"""
Create missing tables for PayPal and SaaS Settings.
Run with: venv\Scripts\python.exe create_tables.py
"""
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Need service role key for DDL operations
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SERVICE_ROLE_KEY:
    # Try loading from render or use a known key
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY not found in .env")
    print("Please add it to backend/.env")
    exit(1)

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# SQL to create the tables
sql_statements = [
    # 1. payment_transactions table
    """
    CREATE TABLE IF NOT EXISTS public.payment_transactions (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        paypal_order_id text,
        paypal_capture_id text,
        academy_id uuid REFERENCES public.academies(id),
        plan_id text,
        amount numeric DEFAULT 0,
        currency text DEFAULT 'USD',
        status text DEFAULT 'pending',
        created_at timestamptz DEFAULT now(),
        completed_at timestamptz
    );
    """,
    # 2. RLS policy for payment_transactions
    """
    ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
    """,
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'payment_transactions' AND policyname = 'Allow all for service role'
        ) THEN
            CREATE POLICY "Allow all for service role" ON public.payment_transactions
                FOR ALL USING (true) WITH CHECK (true);
        END IF;
    END
    $$;
    """,
    # 3. saas_settings table
    """
    CREATE TABLE IF NOT EXISTS public.saas_settings (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        platform_name text DEFAULT 'Academy SaaS Platform',
        support_email text DEFAULT 'support@academy.com',
        default_trial_days integer DEFAULT 14,
        max_players_starter integer DEFAULT 50,
        max_players_pro integer DEFAULT 200,
        max_coaches_starter integer DEFAULT 2,
        max_coaches_pro integer DEFAULT 10,
        auto_provision boolean DEFAULT true,
        email_notifications boolean DEFAULT true,
        auto_backup boolean DEFAULT true,
        maintenance_mode boolean DEFAULT false,
        paypal_sandbox boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );
    """,
    # 4. RLS policy for saas_settings
    """
    ALTER TABLE public.saas_settings ENABLE ROW LEVEL SECURITY;
    """,
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'saas_settings' AND policyname = 'Allow all for service role'
        ) THEN
            CREATE POLICY "Allow all for service role" ON public.saas_settings
                FOR ALL USING (true) WITH CHECK (true);
        END IF;
    END
    $$;
    """,
    # 5. Add missing columns to academies if they don't exist
    """
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academies' AND column_name = 'plan_id') THEN
            ALTER TABLE public.academies ADD COLUMN plan_id text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academies' AND column_name = 'last_payment_at') THEN
            ALTER TABLE public.academies ADD COLUMN last_payment_at timestamptz;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academies' AND column_name = 'domain_status') THEN
            ALTER TABLE public.academies ADD COLUMN domain_status text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academies' AND column_name = 'custom_domain') THEN
            ALTER TABLE public.academies ADD COLUMN custom_domain text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academies' AND column_name = 'subscription_status') THEN
            ALTER TABLE public.academies ADD COLUMN subscription_status text DEFAULT 'active';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academies' AND column_name = 'billing_cycle_start') THEN
            ALTER TABLE public.academies ADD COLUMN billing_cycle_start timestamptz;
        END IF;
    END
    $$;
    """,
]

print("🔧 Creating missing tables in Supabase...\n")

for i, sql in enumerate(sql_statements):
    desc = sql.strip().split('\n')[0].strip()
    print(f"  [{i+1}/{len(sql_statements)}] {desc[:80]}...")
    
    r = httpx.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        json={"query": sql.strip()},
        headers=headers,
        timeout=30
    )
    
    if r.status_code in [200, 201, 204]:
        print(f"    ✅ Success")
    elif r.status_code == 404 and "exec_sql" in r.text:
        # exec_sql function doesn't exist, need to use SQL editor directly
        print(f"    ⚠️ exec_sql RPC not available - will try alternative method")
        break
    else:
        print(f"    ❌ Error ({r.status_code}): {r.text[:200]}")

print("\n📋 Done!")

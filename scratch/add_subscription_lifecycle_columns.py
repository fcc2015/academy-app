import httpx
import sys

with open('backend/.env', 'r') as f:
    env = {}
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k] = v

url = env.get('SUPABASE_URL', '')
key = env.get('SUPABASE_SERVICE_ROLE_KEY', '')

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json',
}

sql = """
-- 1. Add subscription columns to public.academies if they don't exist
ALTER TABLE public.academies
ADD COLUMN IF NOT EXISTS billing_cycle_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS billing_cycle_type TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ;

-- 2. Add billing_cycle_type column to public.payment_transactions
ALTER TABLE public.payment_transactions
ADD COLUMN IF NOT EXISTS billing_cycle_type TEXT DEFAULT 'monthly';

-- 3. Populate columns for existing academies
UPDATE public.academies
SET 
  billing_cycle_start = COALESCE(billing_cycle_start, created_at, now()),
  billing_cycle_type = COALESCE(billing_cycle_type, 'monthly')
WHERE billing_cycle_start IS NULL OR billing_cycle_type IS NULL;

UPDATE public.academies
SET 
  billing_cycle_end = billing_cycle_start + INTERVAL '1 month',
  grace_period_end = billing_cycle_start + INTERVAL '1 month' + INTERVAL '7 days'
WHERE billing_cycle_end IS NULL OR grace_period_end IS NULL;
"""

r = httpx.post(
    f'{url}/rest/v1/rpc/exec_sql',
    json={'query': sql},
    headers=headers,
    timeout=20
)
print('RPC STATUS:', r.status_code, r.text[:300])
if r.status_code != 200:
    print("Migration failed. Please run SQL manually in Supabase editor:")
    print(sql)
    sys.exit(1)
else:
    print("Migration successful! Columns added and populated.")

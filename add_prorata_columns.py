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
ALTER TABLE public.academy_settings
ADD COLUMN IF NOT EXISTS prorata_start_month INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS prorata_discount_percentage INTEGER DEFAULT 30;
"""

r = httpx.post(
    f'{url}/rest/v1/rpc/exec_sql',
    json={'query': sql},
    headers=headers,
    timeout=15
)
print('RPC STATUS:', r.status_code, r.text[:300])
if r.status_code != 200:
    print("Please execute the following SQL in Supabase SQL editor:")
    print(sql)
    sys.exit(1)
else:
    print("Migration successful")

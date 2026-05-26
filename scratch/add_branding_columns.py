import httpx

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

# Add primary_color and secondary_color columns
sql = """
ALTER TABLE academy_settings
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#4f46e5',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#7c3aed';
"""

r = httpx.post(
    f'{url}/rest/v1/rpc/exec_sql',
    json={'query': sql},
    headers=headers,
    timeout=15
)
print('RPC STATUS:', r.status_code, r.text[:300])

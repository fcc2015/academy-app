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

# Add season_start and season_end columns
sql = """
ALTER TABLE academy_settings
ADD COLUMN IF NOT EXISTS season_start TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS season_end TEXT DEFAULT NULL;
"""

r = httpx.post(
    f'{url}/rest/v1/rpc/exec_sql',
    json={'query': sql},
    headers=headers,
    timeout=15
)
print('RPC STATUS:', r.status_code, r.text[:300])

# If RPC doesn't work, try direct SQL via pg
if r.status_code != 200:
    print('RPC failed, trying via raw SQL...')
    # Use the Supabase SQL editor API
    import psycopg2
    # Fallback: just use the REST API to add columns via a workaround
    print('Will need manual migration. Run this SQL in Supabase dashboard:')
    print(sql)

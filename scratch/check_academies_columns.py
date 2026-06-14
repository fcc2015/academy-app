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
    'Prefer': 'return=representation'
}

r = httpx.get(
    f'{url}/rest/v1/academies?select=*&limit=1',
    headers=headers,
    timeout=10
)
print('STATUS:', r.status_code)
if r.status_code == 200 and r.json():
    row = r.json()[0]
    print('academies columns:', list(row.keys()))
else:
    print(r.text[:500])

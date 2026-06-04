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

# Check academies columns
r = httpx.get(
    f'{url}/rest/v1/academies?select=*&limit=1',
    headers=headers,
    timeout=10
)
print('ACADEMIES STATUS:', r.status_code)
if r.status_code == 200 and r.json():
    row = r.json()[0]
    print('ACADEMIES COLUMNS:', list(row.keys()))
else:
    print('ACADEMIES FAILED/EMPTY:', r.text)

# Check academy_settings columns
r2 = httpx.get(
    f'{url}/rest/v1/academy_settings?select=*&limit=1',
    headers=headers,
    timeout=10
)
print('ACADEMY_SETTINGS STATUS:', r2.status_code)
if r2.status_code == 200 and r2.json():
    row2 = r2.json()[0]
    print('ACADEMY_SETTINGS COLUMNS:', list(row2.keys()))
else:
    print('ACADEMY_SETTINGS FAILED/EMPTY:', r2.text)

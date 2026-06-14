import httpx
import json

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
}

r = httpx.get(f'{url}/rest/v1/', headers=headers)
print('STATUS:', r.status_code)
if r.status_code == 200:
    spec = r.json()
    paths = list(spec.get('paths', {}).keys())
    rpc_paths = [p for p in paths if p.startswith('/rpc/')]
    print('RPC FUNCTIONS found:')
    for p in rpc_paths:
        print(p)
else:
    print(r.text[:500])

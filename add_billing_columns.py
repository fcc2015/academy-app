"""
Migration: Add billing discount and local payment columns to academy_settings.
Run once: python add_billing_columns.py
"""
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

# Check current columns
r = httpx.get(f'{url}/rest/v1/academy_settings?select=*&limit=1', headers=headers, timeout=10)
print('STATUS:', r.status_code)

if r.status_code == 200 and r.json():
    row = r.json()[0]
    cols = list(row.keys())
    print('Current columns:', cols)
    
    missing = []
    if 'bank_rib' not in cols: missing.append('bank_rib')
    if 'wafacash_details' not in cols: missing.append('wafacash_details')
    if 'cashplus_details' not in cols: missing.append('cashplus_details')
    if 'family_discount_percentage' not in cols: missing.append('family_discount_percentage')
    
    print(f'Missing columns: {missing}')
    
    if missing:
        # Build ALTER TABLE SQL
        parts = []
        if 'bank_rib' in missing: parts.append('ADD COLUMN IF NOT EXISTS bank_rib TEXT')
        if 'wafacash_details' in missing: parts.append('ADD COLUMN IF NOT EXISTS wafacash_details TEXT')
        if 'cashplus_details' in missing: parts.append('ADD COLUMN IF NOT EXISTS cashplus_details TEXT')
        if 'family_discount_percentage' in missing: parts.append('ADD COLUMN IF NOT EXISTS family_discount_percentage INTEGER DEFAULT 10')
        
        sql = f"ALTER TABLE academy_settings {', '.join(parts)};"
        print(f'\nRunning SQL: {sql}')
        
        # Use the Supabase pg-meta endpoint (only works with service_role)
        rpc_r = httpx.post(
            f'{url}/rest/v1/rpc/exec_sql',
            json={'query': sql},
            headers=headers,
            timeout=15
        )
        
        if rpc_r.status_code in (200, 201, 204):
            print('[OK] Columns added successfully!')
        else:
            print(f'[WARN] RPC exec_sql failed ({rpc_r.status_code}): {rpc_r.text[:300]}')
            print('\n--- MANUAL MIGRATION NEEDED ---')
            print('Please run the following SQL in your Supabase SQL Editor:')
            print(f'\n{sql}\n')
    else:
        print('[OK] All columns already exist. No migration needed.')
else:
    print('Error fetching settings:', r.text[:300])

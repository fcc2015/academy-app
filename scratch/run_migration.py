import asyncio
import httpx
import os

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
-- Proper primary/secondary color columns
ALTER TABLE academy_settings
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#4f46e5';

ALTER TABLE academy_settings
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#7c3aed';

-- WhatsApp auto-notification toggles
ALTER TABLE academy_settings
  ADD COLUMN IF NOT EXISTS whatsapp_absence_alert BOOLEAN DEFAULT true;

ALTER TABLE academy_settings
  ADD COLUMN IF NOT EXISTS whatsapp_payment_reminder BOOLEAN DEFAULT true;

ALTER TABLE academy_settings
  ADD COLUMN IF NOT EXISTS whatsapp_language TEXT DEFAULT 'ar';

-- Migrate existing colors from about_text JSON (safe — only runs if about_text starts with '{')
UPDATE academy_settings
SET
  primary_color = COALESCE(
    (about_text::jsonb ->> 'primary_color'),
    '#4f46e5'
  ),
  secondary_color = COALESCE(
    (about_text::jsonb ->> 'secondary_color'),
    '#7c3aed'
  ),
  about_text = COALESCE(
    (about_text::jsonb ->> 'about_text'),
    about_text
  )
WHERE about_text IS NOT NULL
  AND about_text LIKE '{%';
"""

async def run():
    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        # Try pg/query
        r = await client.post(
            f'{url}/pg/query',
            json={'query': sql},
            headers=headers
        )
        print('pg/query status:', r.status_code)
        print(r.text[:500])

asyncio.run(run())

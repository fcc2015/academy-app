import os
from dotenv import load_dotenv
import httpx

load_dotenv('backend/.env')
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')

data = {
    'type': 'registration',
    'name': 'Test Python',
    'player_name': 'Test Child'
}

print("Using key starting with:", key[:15])

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

res = httpx.post(f"{url}/rest/v1/public_requests", json=data, headers=headers)
print("status_code:", res.status_code)
print("text:", res.text)

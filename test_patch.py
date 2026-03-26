import os
import httpx
from dotenv import load_dotenv

load_dotenv('backend/.env')
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
    "x-backend-secret": "my_super_secret_backend_token_123"
}

res = httpx.patch(
    f"{url}/rest/v1/public_requests?id=eq.91e86e36-e6b3-45d6-bca4-371ec405c9c8",
    json={"status": "processing"},
    headers=headers
)
print(res.status_code, res.text)

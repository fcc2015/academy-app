import httpx
from core.config import settings

url = settings.SUPABASE_URL
key = settings.SUPABASE_KEY

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

# The current failing query in supabase_client.py
query = "select=*,players(full_name)&order=evaluation_date.desc"
endpoint = f"{url}/rest/v1/evaluations?{query}"

print(f"Testing query: {query}")
try:
    res = httpx.get(endpoint, headers=headers)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.text}")
except Exception as e:
    print(f"Error: {e}")

# Testing the proposed fix
fixed_query = "select=*,players(users(full_name))&order=evaluation_date.desc"
fixed_endpoint = f"{url}/rest/v1/evaluations?{fixed_query}"

print(f"\nTesting fixed query: {fixed_query}")
try:
    res = httpx.get(fixed_endpoint, headers=headers)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.text}")
except Exception as e:
    print(f"Error: {e}")

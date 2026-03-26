import httpx
import json
from core.config import settings

url = settings.SUPABASE_URL
key = settings.SUPABASE_KEY
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Test inserting into users table
user_data = {
    "user_id": "debug-user-123",
    "full_name": "Debug User",
    "role": "Player"
}

print("Testing insert into 'users' table...")
res = httpx.post(f"{url}/rest/v1/users", json=user_data, headers=headers)
print(f"Status: {res.status_code}")
print(f"Response: {res.text}")

# Test inserting into players table
player_data = {
    "user_id": "debug-user-123",
    "birth_date": "2015-01-01",
    "technical_level": "A",
    "subscription_type": "Monthly",
    "u_category": "U11",
    "parent_name": "Parent",
    "parent_whatsapp": "+212600000000"
}

print("\nTesting insert into 'players' table...")
res = httpx.post(f"{url}/rest/v1/players", json=player_data, headers=headers)
print(f"Status: {res.status_code}")
print(f"Response: {res.text}")

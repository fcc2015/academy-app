import httpx
import sys

SUPABASE_URL = "https://kbhnqntteexatihidhkn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDk2MDksImV4cCI6MjA4ODMyNTYwOX0.dwF2cxTuH7tCjDQv_IXsQNzWQmol6FbvWV17hBSyl94"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

# Check payment_transactions table
r = httpx.get(f"{SUPABASE_URL}/rest/v1/payment_transactions?select=*&limit=1", headers=headers, timeout=15)
print(f"payment_transactions: {r.status_code}")
if r.status_code != 200:
    print(f"  Error: {r.text[:300]}")
else:
    print(f"  OK - {r.json()}")

# Check saas_settings table
r2 = httpx.get(f"{SUPABASE_URL}/rest/v1/saas_settings?select=*&limit=1", headers=headers, timeout=15)
print(f"saas_settings: {r2.status_code}")
if r2.status_code != 200:
    print(f"  Error: {r2.text[:300]}")
else:
    print(f"  OK - {r2.json()}")

# Check academies table
r3 = httpx.get(f"{SUPABASE_URL}/rest/v1/academies?select=*&limit=1", headers=headers, timeout=15)
print(f"academies: {r3.status_code}")
if r3.status_code != 200:
    print(f"  Error: {r3.text[:300]}")
else:
    print(f"  OK - {r3.json()}")

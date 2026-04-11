import httpx
import asyncio

SUPABASE_URL = "https://kbhnqntteexatihidhkn.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDk2MDksImV4cCI6MjA4ODMyNTYwOX0.dwF2cxTuH7tCjDQv_IXsQNzWQmol6FbvWV17hBSyl94"

async def test_login():
    headers = {"apikey": ANON_KEY, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            json={"email": "admin@academy.com", "password": "Admin@2024"},
            headers=headers
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            d = r.json()
            role = d.get("user", {}).get("user_metadata", {}).get("role")
            print(f"SUCCESS! Role: {role}")
            print(f"Token: {d.get('access_token', '')[:60]}...")
        else:
            print(f"FAILED: {r.text[:300]}")

asyncio.run(test_login())

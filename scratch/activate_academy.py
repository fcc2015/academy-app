import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def activate_academy():
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        print(f"Error: SUPABASE_URL={SUPABASE_URL}, SERVICE_ROLE_KEY={SERVICE_ROLE_KEY[:10] if SERVICE_ROLE_KEY else None}")
        return
        
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    academy_id = "37db1621-a761-4273-b4ad-ad89deb734a6"
    
    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        print(f"Updating academy status to active for ID {academy_id}...")
        res = await client.patch(
            f"{SUPABASE_URL}/rest/v1/academies?id=eq.{academy_id}",
            json={
                "status": "active",
                "subscription_status": "active"
            },
            headers=headers
        )
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            print("Response:")
            print(res.json())
        else:
            print("Error:", res.text)

if __name__ == "__main__":
    asyncio.run(activate_academy())

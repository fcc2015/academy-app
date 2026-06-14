import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def check_admins():
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        # Fetch admins
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/admins?limit=10",
            headers=headers
        )
        print(f"Admins status: {res.status_code}")
        if res.status_code == 200:
            print("Admins:")
            for row in res.json():
                print(f"  Email: {row.get('email')}, Role: {row.get('role') or 'admin'}, Academy ID: {row.get('academy_id')}")
        else:
            print(res.text)

if __name__ == "__main__":
    asyncio.run(check_admins())

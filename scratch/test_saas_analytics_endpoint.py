import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from dotenv import load_dotenv
load_dotenv("backend/.env")

from core.config import settings
import httpx

async def main():
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        # 1. Check academies query
        r1 = await client.get(
            f"{url}/rest/v1/academies?select=id,created_at,plan_id,city,status",
            headers=headers
        )
        print("Academies response status:", r1.status_code)
        if r1.status_code != 200:
            print("Academies response error:", r1.text)
        else:
            print("Academies count:", len(r1.json()))

        # 2. Check payments_gateway query
        r2 = await client.get(
            f"{url}/rest/v1/payments_gateway?select=amount,created_at,status",
            headers=headers
        )
        print("Payments Gateway response status:", r2.status_code)
        if r2.status_code != 200:
            print("Payments Gateway response error:", r2.text)
        else:
            print("Payments Gateway count:", len(r2.json()))

if __name__ == "__main__":
    asyncio.run(main())

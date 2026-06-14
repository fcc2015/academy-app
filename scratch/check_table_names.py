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
        # Check payments table
        r1 = await client.get(
            f"{url}/rest/v1/payments?select=*",
            headers=headers
        )
        print("Payments table status:", r1.status_code)
        if r1.status_code == 200:
            data = r1.json()
            print("Payments count:", len(data))
            if data:
                print("Payments columns:", list(data[0].keys()))
        else:
            print("Payments table error:", r1.text)

        # Check payment_transactions table
        r2 = await client.get(
            f"{url}/rest/v1/payment_transactions?select=*",
            headers=headers
        )
        print("Payment Transactions table status:", r2.status_code)
        if r2.status_code == 200:
            data = r2.json()
            print("Payment Transactions count:", len(data))
            if data:
                print("Payment Transactions columns:", list(data[0].keys()))
        else:
            print("Payment Transactions table error:", r2.text)

if __name__ == "__main__":
    asyncio.run(main())

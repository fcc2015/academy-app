import httpx
from core.config import settings

async def main():
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{url}/rest/v1/subscription_plans?limit=1", headers=headers)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            if data:
                print("Columns in subscription_plans:", list(data[0].keys()))
            else:
                print("Table is empty, no data to inspect keys.")
        else:
            print("Error details:", r.text)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

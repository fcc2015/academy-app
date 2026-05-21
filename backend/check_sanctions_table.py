import asyncio
import httpx
from core.config import settings

async def main():
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{url}/rest/v1/player_sanctions?limit=1", headers=headers)
        print("Status code:", r.status_code)
        if r.status_code == 200:
            print("Table exists!")
            data = r.json()
            if data:
                print("Sanction keys:", list(data[0].keys()))
            else:
                print("Table is empty, but it exists.")
        else:
            print("Table doesn't exist or error:", r.text)

if __name__ == "__main__":
    asyncio.run(main())

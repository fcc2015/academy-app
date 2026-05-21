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
        # Fetch one player
        r = await client.get(f"{url}/rest/v1/players?limit=1", headers=headers)
        if r.status_code == 200:
            data = r.json()
            if data:
                print("Player keys:", list(data[0].keys()))
                print("Player data:", data[0])
                
        # Fetch one user
        r = await client.get(f"{url}/rest/v1/users?limit=1", headers=headers)
        if r.status_code == 200:
            data = r.json()
            if data:
                print("\nUser keys:", list(data[0].keys()))
                print("User data:", data[0])

if __name__ == "__main__":
    asyncio.run(main())

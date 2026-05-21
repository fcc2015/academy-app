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
        r = await client.get(f"{url}/rest/v1/", headers=headers)
        if r.status_code == 200:
            swagger = r.json()
            definitions = swagger.get("definitions", {})
            print("--- ALL TABLES IN SUPABASE REST API ---")
            for table in sorted(definitions.keys()):
                print(f" - {table}")
        else:
            print("Error:", r.status_code, r.text)

if __name__ == "__main__":
    asyncio.run(main())

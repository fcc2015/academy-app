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
        # Check all tables / schema information if possible by querying postgrest OpenAPI doc
        print("--- Fetching OpenAPI tables list ---")
        r = await client.get(f"{url}/rest/v1/", headers=headers)
        if r.status_code == 200:
            swagger = r.json()
            tables = list(swagger.get("definitions", {}).keys())
            print("Available tables in Supabase REST API:")
            for t in sorted(tables):
                print(f" - {t}")
        else:
            print("Error fetching tables list:", r.status_code)

if __name__ == "__main__":
    asyncio.run(main())

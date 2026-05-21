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
        # Check kit_assignments
        print("--- Fetching one from kit_assignments ---")
        r = await client.get(f"{url}/rest/v1/kit_assignments?limit=1", headers=headers)
        print("Status code:", r.status_code)
        if r.status_code == 200:
            data = r.json()
            if data:
                print("Columns:", list(data[0].keys()))
                print("Data:", data[0])
            else:
                print("Table is empty, but it exists!")
                # Let's get structure from OpenAPI
                r2 = await client.get(f"{url}/rest/v1/", headers=headers)
                if r2.status_code == 200:
                    swagger = r2.json()
                    properties = swagger.get("definitions", {}).get("kit_assignments", {}).get("properties", {})
                    print("kit_assignments properties:", list(properties.keys()))
        else:
            print("Error:", r.status_code, r.text)

if __name__ == "__main__":
    asyncio.run(main())

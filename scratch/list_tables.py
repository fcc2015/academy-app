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
    
    # Try querying schema via PostgREST OpenAPI spec which lists all tables!
    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        r = await client.get(
            f"{url}/rest/v1/",
            headers=headers
        )
        print("Schema info status:", r.status_code)
        if r.status_code == 200:
            swagger = r.json()
            paths = swagger.get("paths", {})
            print("Available endpoints (tables/views):")
            for path in paths:
                if path.startswith("/"):
                    print(f"  {path}")
        else:
            print("Failed to get schema info:", r.text)

if __name__ == "__main__":
    asyncio.run(main())

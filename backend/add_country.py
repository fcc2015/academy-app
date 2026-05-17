import asyncio
from core.config import settings
import httpx

async def f():
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{settings.SUPABASE_URL}/pg/query",
            headers={
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
            },
            json={"query": "ALTER TABLE academies ADD COLUMN IF NOT EXISTS country text;"}
        )
        print(r.status_code, r.text)
        
        # also make sure city is added just in case
        r2 = await c.post(
            f"{settings.SUPABASE_URL}/pg/query",
            headers={
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
            },
            json={"query": "ALTER TABLE academies ADD COLUMN IF NOT EXISTS city text;"}
        )
        print(r2.status_code, r2.text)

asyncio.run(f())

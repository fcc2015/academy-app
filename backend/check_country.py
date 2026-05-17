import asyncio
from core.config import settings
import httpx

async def f():
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{settings.SUPABASE_URL}/rest/v1/academies?select=country&limit=1",
            headers={
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
            }
        )
        print(r.status_code, r.text)

asyncio.run(f())

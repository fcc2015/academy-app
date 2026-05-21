import asyncio
import httpx
from core.config import settings

async def main():
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_KEY
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        # Check academies
        print("--- Academies ---")
        r = await client.get(f"{url}/rest/v1/academies", headers=headers)
        if r.status_code == 200:
            academies = r.json()
            print(f"Total academies: {len(academies)}")
            for ac in academies:
                print(f"ID: {ac.get('id')}, Name: {ac.get('name')}")
        else:
            print("Error academies:", r.status_code)
            
        # Check users
        print("\n--- Users ---")
        r = await client.get(f"{url}/rest/v1/users", headers=headers)
        if r.status_code == 200:
            users = r.json()
            print(f"Total users: {len(users)}")
            for u in users[:10]:
                print(f"ID: {u.get('user_id')}, Name: {u.get('full_name')}, Role: {u.get('role')}")
        else:
            print("Error users:", r.status_code)

if __name__ == "__main__":
    asyncio.run(main())

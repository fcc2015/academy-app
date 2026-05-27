import asyncio
import os
from dotenv import load_dotenv
from services.supabase_client import supabase

async def main():
    load_dotenv()
    print("Checking database...")
    for path in ["/rest/v1/branches?limit=1", "/rest/v1/stories?limit=1", "/rest/v1/advertisements?limit=1", "/rest/v1/players?select=coach_notes&limit=1", "/rest/v1/matches?select=match_attendance&limit=1"]:
        try:
            res = await supabase._get(path)
            print(f"{path} -> EXISTS:", res)
        except Exception as e:
            print(f"{path} -> FAILED:", e)

if __name__ == "__main__":
    asyncio.run(main())

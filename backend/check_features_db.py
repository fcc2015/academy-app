import asyncio
import os
from dotenv import load_dotenv
from services.supabase_client import supabase

async def main():
    load_dotenv()
    print("Checking database tables...")
    try:
        # Check stories
        try:
            stories = await supabase._get("/rest/v1/stories?select=*&limit=1")
            print("stories table: EXISTS", stories)
        except Exception as e:
            print("stories table: ERROR", e)

        # Check advertisements
        try:
            ads = await supabase._get("/rest/v1/advertisements?select=*&limit=1")
            print("advertisements table: EXISTS", ads)
        except Exception as e:
            print("advertisements table: ERROR", e)

        # Check players coach_notes
        try:
            players = await supabase._get("/rest/v1/players?select=coach_notes&limit=1")
            print("players.coach_notes column: EXISTS", players)
        except Exception as e:
            print("players.coach_notes column: ERROR", e)

        # Check matches match_attendance
        try:
            matches = await supabase._get("/rest/v1/matches?select=match_attendance&limit=1")
            print("matches.match_attendance column: EXISTS", matches)
        except Exception as e:
            print("matches.match_attendance column: ERROR", e)

    except Exception as e:
        print("General Error:", e)

if __name__ == "__main__":
    asyncio.run(main())

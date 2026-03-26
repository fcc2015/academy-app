import asyncio
import os
import sys
import httpx

# add backend dir to sys.path
sys.path.append('c:/Users/hp/Desktop/python_learning/academy-app/backend')

from core.config import settings
from services.supabase_client import supabase

async def main():
    player_data = {
        "user_id": "00000000-0000-0000-0000-000000000099",
        "birth_date": "2015-01-01",
        "technical_level": "B",
        "subscription_type": "Silver",
        "u_category": "U11",
        "parent_name": "Test Parent",
        "parent_whatsapp": "12345678",
        "account_status": "Pending"
    }

    try:
        user_data = {
            "id": player_data["user_id"],
            "full_name": "Test Player",
            "role": "player"
        }
        print("Inserting user...")
        user_res = await supabase.insert_user(user_data)
        print("User res:", user_res)
        
        print("Inserting player...")
        player_res = await supabase.insert_player(player_data)
        print("Player res:", player_res)
        
        # Cleanup
        await supabase.delete_player("00000000-0000-0000-0000-000000000099")
        # cannot delete user via standard supase rest api easily unless admin, but that's fine
    except httpx.HTTPStatusError as e:
        print("HTTP ERROR:", e)
        print("Response body:", e.response.text)
    except Exception as e:
        print("ERROR:", type(e), e)
if __name__ == "__main__":
    asyncio.run(main())

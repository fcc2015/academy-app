import asyncio
import httpx
import os
import sys

# Try loading from .env if present
try:
    from dotenv import load_dotenv
    load_dotenv('c:/Users/hp/Desktop/python_learning/academy-app/backend/.env')
except ImportError:
    pass

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://kbhnqntteexatihidhkn.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

async def main():
    if not SUPABASE_KEY:
        print("Missing SUPABASE_SERVICE_ROLE_KEY")
        return

    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    async with httpx.AsyncClient(trust_env=False) as client:
        # Get a parent that has a child
        r1 = await client.get(f"{SUPABASE_URL}/rest/v1/players?parent_id=not.is.null&select=user_id,parent_id,squad_id&limit=1", headers=headers)
        if not r1.json():
            print("No players with parent found.")
            return
            
        player = r1.json()[0]
        parent_id = player['parent_id']
        player_id = player['user_id']
        squad_id = player.get('squad_id')
        print(f"Found Player: {player_id} | Parent: {parent_id} | Squad: {squad_id}")
        
        # Test backend API logic simulation
        # 1. find groups where player is member
        r2 = await client.get(f"{SUPABASE_URL}/rest/v1/chat_group_members?user_id=eq.{player_id}&select=group_id", headers=headers)
        member_groups = r2.json()
        print(f"Player explicit groups: {member_groups}")
        
        # 2. find groups for squad
        if squad_id:
            r3 = await client.get(f"{SUPABASE_URL}/rest/v1/chat_groups?squad_id=eq.{squad_id}&select=id,name", headers=headers)
            squad_groups = r3.json()
            print(f"Squad groups: {squad_groups}")
        else:
            print("Player has no squad.")

        # Let's also find groups for parent directly
        r4 = await client.get(f"{SUPABASE_URL}/rest/v1/chat_group_members?user_id=eq.{parent_id}&select=group_id", headers=headers)
        print(f"Parent explicit groups: {r4.json()}")
            
if __name__ == "__main__":
    asyncio.run(main())

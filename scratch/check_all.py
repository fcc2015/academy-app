import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def check_all():
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        # Fetch academies
        res_acad = await client.get(
            f"{SUPABASE_URL}/rest/v1/academies?select=id,name,subdomain,status,subscription_status",
            headers=headers
        )
        print("ACADEMIES:")
        acad_dict = {}
        if res_acad.status_code == 200:
            for row in res_acad.json():
                print(f"  ID: {row.get('id')}, Name: {row.get('name')}, Subdomain: {row.get('subdomain')}, Status: {row.get('status')}, Subscription: {row.get('subscription_status')}")
                acad_dict[row.get('id')] = row
        else:
            print("Error:", res_acad.text)
            
        # Fetch admins
        res_admin = await client.get(
            f"{SUPABASE_URL}/rest/v1/admins?select=user_id,email,full_name,academy_id",
            headers=headers
        )
        print("\nADMINS:")
        if res_admin.status_code == 200:
            for row in res_admin.json():
                aid = row.get('academy_id')
                acad_name = acad_dict.get(aid, {}).get('name', 'Unknown')
                print(f"  Email: {row.get('email')}, Name: {row.get('full_name')}, Academy: {acad_name} ({aid})")
        else:
            print("Error:", res_admin.text)

if __name__ == "__main__":
    asyncio.run(check_all())

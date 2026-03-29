import asyncio
import sys
import os

# Ensure backend modules can be imported
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))

from services.supabase_client import supabase

async def create_admin():
    try:
        # Check if login works first
        print("Checking if admin exists...")
        try:
            res = await supabase.sign_in_with_password("saasadmin@academy.com", "SaaSAdmin123!")
            print("Admin already exists! Login success.")
            return
        except Exception as login_e:
            pass

        print("Registering new Super Admin...")
        response = await supabase.sign_up(
            "saasadmin@academy.com",
            "SaaSAdmin123!",
            data={"role": "super_admin", "full_name": "SaaS Super Admin"}
        )
        print("SUCCESS! Admin created:", response.user.id if response.user else response)
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(create_admin())

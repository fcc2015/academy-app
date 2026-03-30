"""
Create or verify Super Admin user for SaaS Dashboard access.
Run: python scripts/create_super_admin.py
"""
import httpx
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend folder
env_path = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

ADMIN_EMAIL = "admin@academysaas.com"       # ← Change this
ADMIN_PASSWORD = "SuperAdmin2026!"          # ← Change this
ADMIN_NAME = "Super Admin"

if not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ SUPABASE_SERVICE_ROLE_KEY not found in backend/.env!")
    print("")
    print("📋 To fix this:")
    print("   1. Go to https://supabase.com/dashboard → Your Project")
    print("   2. Settings → API → service_role (Secret)")
    print("   3. Copy the key and add to backend/.env:")
    print("      SUPABASE_SERVICE_ROLE_KEY=eyJ...")
    print("")
    sys.exit(1)

async def create_super_admin():
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Create auth user with super_admin role
        print(f"🔐 Creating super_admin: {ADMIN_EMAIL}")
        res = await client.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "email_confirm": True,
                "user_metadata": {
                    "role": "super_admin",
                    "full_name": ADMIN_NAME
                }
            },
            headers=headers
        )

        if res.status_code in [200, 201]:
            user = res.json()
            user_id = user["id"]
            print(f"✅ Auth user created: {user_id}")

            # Step 2: Create public.users record
            try:
                res2 = await client.post(
                    f"{SUPABASE_URL}/rest/v1/users",
                    json={
                        "id": user_id,
                        "user_id": user_id,
                        "full_name": ADMIN_NAME,
                        "role": "super_admin",
                    },
                    headers={**headers, "Prefer": "return=representation"}
                )
                print(f"✅ Public users record created")
            except Exception as e:
                print(f"⚠️  Users record (non-critical): {e}")

            print(f"\n{'='*50}")
            print(f"🎉 SUPER ADMIN READY!")
            print(f"{'='*50}")
            print(f"📧 Email:    {ADMIN_EMAIL}")
            print(f"🔑 Password: {ADMIN_PASSWORD}")
            print(f"🌐 Login:    https://jolly-kangaroo-3c3d92.netlify.app/saas/login")
            print(f"{'='*50}")
        elif res.status_code == 422:
            print(f"⚠️  User already exists. Updating role...")
            # Get existing user
            res_list = await client.get(
                f"{SUPABASE_URL}/auth/v1/admin/users",
                headers=headers
            )
            if res_list.status_code == 200:
                users = res_list.json().get("users", [])
                for u in users:
                    if u.get("email") == ADMIN_EMAIL:
                        user_id = u["id"]
                        # Update to super_admin role
                        await client.put(
                            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                            json={
                                "user_metadata": {"role": "super_admin", "full_name": ADMIN_NAME},
                                "password": ADMIN_PASSWORD
                            },
                            headers=headers
                        )
                        print(f"✅ Updated to super_admin: {user_id}")
                        print(f"\n🌐 Login: https://jolly-kangaroo-3c3d92.netlify.app/saas/login")
                        print(f"📧 Email: {ADMIN_EMAIL}")
                        print(f"🔑 Password: {ADMIN_PASSWORD}")
                        break
        else:
            print(f"❌ Error: {res.status_code} - {res.text}")

if __name__ == "__main__":
    asyncio.run(create_super_admin())

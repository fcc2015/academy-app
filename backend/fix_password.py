"""Reset super_admin password using Supabase Auth Admin API"""
import httpx
import asyncio
from core.config import settings

async def reset_password():
    url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    
    # Step 1: Find the super_admin user
    user_id = "9128d257-033e-4501-ac8d-6b1a28f2d427"
    
    # Step 2: Update password via Admin API
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.put(
            f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            json={
                "password": "Admin@2024",
                "email_confirm": True
            },
            headers=headers
        )
        print(f"Update status: {res.status_code}")
        print(f"Response: {res.text[:500]}")
        
        if res.status_code == 200:
            print("\n✅ Password updated successfully!")
            
            # Step 3: Test login
            login_res = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password",
                json={"email": "admin@academy.com", "password": "Admin@2024"},
                headers={
                    "apikey": settings.SUPABASE_KEY,
                    "Content-Type": "application/json",
                }
            )
            print(f"\nLogin test status: {login_res.status_code}")
            if login_res.status_code == 200:
                data = login_res.json()
                role = data.get("user", {}).get("user_metadata", {}).get("role", "unknown")
                print(f"✅ Login SUCCESS! Role: {role}")
                print(f"Access token: {data.get('access_token', '')[:50]}...")
            else:
                print(f"❌ Login FAILED: {login_res.text[:300]}")
        else:
            print(f"❌ Password update failed!")

asyncio.run(reset_password())

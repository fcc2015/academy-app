"""Create super_admin using Supabase Auth signup API — GoTrue hashes the password properly."""
import httpx
import asyncio

SUPABASE_URL = "https://kbhnqntteexatihidhkn.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDk2MDksImV4cCI6MjA4ODMyNTYwOX0.dwF2cxTuH7tCjDQv_IXsQNzWQmol6FbvWV17hBSyl94"

async def main():
    headers = {
        "apikey": ANON_KEY,
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Sign up via GoTrue (password hashed by GoTrue itself)
        print("Step 1: Creating user via signup API...")
        signup_res = await client.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            json={
                "email": "admin@academy.com",
                "password": "Admin@2024",
                "data": {
                    "role": "super_admin",
                    "full_name": "Super Admin"
                }
            },
            headers=headers
        )
        print(f"  Signup status: {signup_res.status_code}")
        signup_data = signup_res.json()
        
        if signup_res.status_code in [200, 201]:
            user_id = signup_data.get("id") or signup_data.get("user", {}).get("id")
            print(f"  User ID: {user_id}")
            print(f"  ✅ User created successfully!")
        else:
            print(f"  Response: {signup_res.text[:300]}")
            return
        
        # Step 2: Test login immediately
        print("\nStep 2: Testing login...")
        login_res = await client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            json={
                "email": "admin@academy.com",
                "password": "Admin@2024"
            },
            headers=headers
        )
        print(f"  Login status: {login_res.status_code}")
        
        if login_res.status_code == 200:
            login_data = login_res.json()
            role = login_data.get("user", {}).get("user_metadata", {}).get("role", "unknown")
            print(f"  ✅ LOGIN SUCCESS! Role: {role}")
            print(f"  Token: {login_data.get('access_token', '')[:60]}...")
        else:
            print(f"  ❌ Login failed: {login_res.text[:300]}")

asyncio.run(main())

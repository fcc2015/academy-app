"""
Fix/Create super_admin user in Supabase.
Uses the Auth Admin API (service_role key) to:
1. List all existing users to find any super_admin
2. Delete old/broken super_admin records 
3. Create a fresh super_admin with known credentials
4. Ensure public.users record exists
"""
import httpx
import sys
import json

URL = "https://kbhnqntteexatihidhkn.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDk2MDksImV4cCI6MjA4ODMyNTYwOX0.dwF2cxTuH7tCjDQv_IXsQNzWQmol6FbvWV17hBSyl94"
SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc0OTYwOSwiZXhwIjoyMDg0MzI1NjA5fQ.3n5lrv0GNtHPBOzll8PvJlCXczzA1kKRJuNDTmW1aCE"

ADMIN_HEADERS = {
    "apikey": SRK,
    "Authorization": f"Bearer {SRK}",
    "Content-Type": "application/json",
}

ANON_HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
}

EMAIL = "superadmin@saas.com"
PASSWORD = "Admin@2024!"

def main():
    with httpx.Client(timeout=30.0) as client:
        # Step 1: List auth users
        print("=" * 60)
        print("STEP 1: Listing all auth users...")
        print("=" * 60)
        res = client.get(f"{URL}/auth/v1/admin/users", headers=ADMIN_HEADERS)
        if res.status_code != 200:
            print(f"FAILED to list users: {res.status_code} {res.text[:200]}")
            sys.exit(1)
        
        users = res.json().get("users", [])
        print(f"Found {len(users)} users in auth.users:")
        
        super_admin_ids = []
        for u in users:
            role = u.get("user_metadata", {}).get("role", "unknown")
            email = u.get("email", "?")
            uid = u.get("id", "?")
            print(f"  → {email} | role={role} | id={uid}")
            if role == "super_admin":
                super_admin_ids.append(uid)
        
        # Step 2: Delete existing super_admin users (clean slate)
        if super_admin_ids:
            print(f"\nSTEP 2: Deleting {len(super_admin_ids)} existing super_admin(s)...")
            for uid in super_admin_ids:
                # Delete from public.users first
                r = client.delete(
                    f"{URL}/rest/v1/users?id=eq.{uid}",
                    headers=ADMIN_HEADERS
                )
                print(f"  public.users delete: {r.status_code}")
                
                # Delete from auth.users
                r = client.delete(
                    f"{URL}/auth/v1/admin/users/{uid}",
                    headers=ADMIN_HEADERS
                )
                print(f"  auth.users delete: {r.status_code}")
        
        # Also check if the target email already exists as non-super_admin
        for u in users:
            if u.get("email") == EMAIL and u["id"] not in super_admin_ids:
                uid = u["id"]
                print(f"\n  Deleting existing user with email {EMAIL} (id={uid})...")
                client.delete(f"{URL}/rest/v1/users?id=eq.{uid}", headers=ADMIN_HEADERS)
                client.delete(f"{URL}/auth/v1/admin/users/{uid}", headers=ADMIN_HEADERS)
        
        # Step 3: Create fresh super_admin
        print(f"\n{'=' * 60}")
        print(f"STEP 3: Creating super_admin: {EMAIL}")
        print(f"{'=' * 60}")
        
        payload = {
            "email": EMAIL,
            "password": PASSWORD,
            "email_confirm": True,
            "user_metadata": {
                "role": "super_admin",
                "full_name": "SaaS Super Admin"
            }
        }
        
        res = client.post(
            f"{URL}/auth/v1/admin/users",
            json=payload,
            headers=ADMIN_HEADERS
        )
        
        if res.status_code not in [200, 201]:
            print(f"FAILED to create user: {res.status_code}")
            print(res.text[:500])
            sys.exit(1)
        
        new_user = res.json()
        new_uid = new_user["id"]
        print(f"✅ Created auth user: {new_uid}")
        print(f"   Email: {EMAIL}")
        print(f"   Role: super_admin")
        
        # Step 4: Create public.users record
        print(f"\n{'=' * 60}")
        print("STEP 4: Creating public.users record...")
        print(f"{'=' * 60}")
        
        pub_user = {
            "id": new_uid,
            "full_name": "SaaS Super Admin",
            "role": "super_admin",
        }
        
        res = client.post(
            f"{URL}/rest/v1/users",
            json=pub_user,
            headers=ADMIN_HEADERS
        )
        
        if res.status_code in [200, 201]:
            print(f"✅ public.users record created")
        elif res.status_code == 409:
            print(f"⚠️  public.users record already exists (conflict), updating...")
            res2 = client.patch(
                f"{URL}/rest/v1/users?id=eq.{new_uid}",
                json={"role": "super_admin", "full_name": "SaaS Super Admin"},
                headers=ADMIN_HEADERS
            )
            print(f"   Update result: {res2.status_code}")
        else:
            print(f"⚠️  public.users insert returned: {res.status_code} {res.text[:200]}")
        
        # Step 5: Verify login works
        print(f"\n{'=' * 60}")
        print("STEP 5: Verifying login...")
        print(f"{'=' * 60}")
        
        res = client.post(
            f"{URL}/auth/v1/token?grant_type=password",
            json={"email": EMAIL, "password": PASSWORD},
            headers=ANON_HEADERS
        )
        
        if res.status_code == 200:
            data = res.json()
            role = data["user"].get("user_metadata", {}).get("role")
            print(f"✅ LOGIN SUCCESSFUL!")
            print(f"   User ID: {data['user']['id']}")
            print(f"   Role: {role}")
            print(f"   Token: {data['access_token'][:50]}...")
        else:
            print(f"❌ LOGIN FAILED: {res.status_code}")
            print(res.text[:300])
        
        print(f"\n{'=' * 60}")
        print("SUMMARY")
        print(f"{'=' * 60}")
        print(f"Email:    {EMAIL}")
        print(f"Password: {PASSWORD}")
        print(f"Role:     super_admin")
        print(f"Use these credentials on /saas/login")

if __name__ == "__main__":
    main()

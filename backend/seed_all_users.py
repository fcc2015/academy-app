import httpx
import json

SUPABASE_URL = "https://kbhnqntteexatihidhkn.supabase.co"
SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc0OTYwOSwiZXhwIjoyMDg4MzI1NjA5fQ.3n5lrv0GNtHPBOzll8PvJlCXczzA1kKRJuNDTmW1aCE"

HEADERS = {
    "apikey": SRK,
    "Authorization": f"Bearer {SRK}",
    "Content-Type": "application/json"
}

USERS_TO_SEED = [
    {
        "email": "superadmin@saas.com",
        "password": "Admin@2024!",
        "role": "super_admin",
        "name": "SaaS Super Admin"
    },
    {
        "email": "admin@fctestmaroc.ma",
        "password": "TestAdmin123!",
        "role": "admin",
        "name": "Admin FC Test"
    },
    {
        "email": "admin@academy.com",
        "password": "Admin@2024",
        "role": "admin",
        "name": "Admin Academy"
    },
    {
        "email": "parent@fctestmaroc.ma",
        "password": "TestParent123!",
        "role": "parent",
        "name": "Parent Test"
    },
    {
        "email": "Eelghazali1987@gmail.com",
        "password": "CoachPass123!",
        "role": "coach",
        "name": "Coach Eelghazali"
    }
]

def main():
    print("Fetching existing auth users...")
    with httpx.Client(timeout=30) as client:
        res = client.get(f"{SUPABASE_URL}/auth/v1/admin/users", headers=HEADERS)
        existing_users = res.json().get("users", []) if res.status_code == 200 else []
        
        user_map = {u["email"].lower(): u["id"] for u in existing_users if "email" in u}
        print(f"Found {len(existing_users)} existing users in auth.")

        for user_info in USERS_TO_SEED:
            email = user_info["email"]
            password = user_info["password"]
            role = user_info["role"]
            name = user_info["name"]
            
            email_lower = email.lower()
            if email_lower in user_map:
                uid = user_map[email_lower]
                print(f"\nUpdating user {email} (ID: {uid})...")
                up_res = client.put(
                    f"{SUPABASE_URL}/auth/v1/admin/users/{uid}",
                    json={
                        "password": password,
                        "email_confirm": True,
                        "user_metadata": {"role": role, "full_name": name}
                    },
                    headers=HEADERS
                )
                print(f"  Update status: {up_res.status_code}")
            else:
                print(f"\nCreating user {email}...")
                create_res = client.post(
                    f"{SUPABASE_URL}/auth/v1/admin/users",
                    json={
                        "email": email,
                        "password": password,
                        "email_confirm": True,
                        "user_metadata": {"role": role, "full_name": name}
                    },
                    headers=HEADERS
                )
                print(f"  Create status: {create_res.status_code}")
                if create_res.status_code in (200, 201):
                    uid = create_res.json().get("id")
                else:
                    print(f"  Error: {create_res.text}")
                    continue

            # Ensure public.users row exists
            pub_user = {
                "id": uid,
                "full_name": name,
                "role": role,
            }
            p_res = client.post(
                f"{SUPABASE_URL}/rest/v1/users",
                json=pub_user,
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates"}
            )
            print(f"  public.users upsert status: {p_res.status_code}")

            # Test login via GoTrue API directly
            login_res = client.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                json={"email": email, "password": password},
                headers={"apikey": SRK, "Content-Type": "application/json"}
            )
            print(f"  Direct Supabase Auth Login test: {login_res.status_code}")

if __name__ == "__main__":
    main()

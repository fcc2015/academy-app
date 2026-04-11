"""
Create test academy + admin user directly via Supabase service_role
"""
import asyncio
import httpx
import uuid
import base64

SUPABASE_URL = "https://kbhnqntteexatihidhkn.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc0OTYwOSwiZXhwIjoyMDg0MzI1NjA5fQ.3n5lrv0GNtHPBOzll8PvJlCXczzA1kKRJuNDTmW1aCE"

ADMIN_HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Test academy data
ACADEMY_NAME = "FC Test Maroc"
ADMIN_EMAIL  = "admin@fctestmaroc.ma"
ADMIN_PASS   = "TestAdmin123!"
ADMIN_NAME   = "Admin Test"

async def main():
    async with httpx.AsyncClient(timeout=30) as c:

        # 1. Create academy record
        print("[1] Creating academy...")
        r = await c.post(
            f"{SUPABASE_URL}/rest/v1/academies?select=id,name",
            json={"name": ACADEMY_NAME, "status": "active", "plan_id": "free"},
            headers=ADMIN_HEADERS
        )
        print(f"    Status: {r.status_code} | {r.text[:200]}")
        
        if r.status_code in [200, 201]:
            rows = r.json()
            academy_id = rows[0]["id"] if isinstance(rows, list) else rows["id"]
        elif r.status_code == 409 or "duplicate" in r.text.lower():
            # Academy already exists - get its ID
            print("    Academy already exists, fetching ID...")
            r2 = await c.get(
                f"{SUPABASE_URL}/rest/v1/academies?name=eq.{ACADEMY_NAME}&select=id,name",
                headers=ADMIN_HEADERS
            )
            rows = r2.json()
            academy_id = rows[0]["id"]
        else:
            print(f"    FAILED: {r.text}")
            return
        
        print(f"    Academy ID: {academy_id}")

        # 2. Create admin user via Supabase Auth
        print("\n[2] Creating admin user in Supabase Auth...")
        auth_r = await c.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASS,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": ADMIN_NAME,
                    "role": "admin",
                    "academy_id": academy_id
                }
            },
            headers={
                "apikey": SERVICE_KEY,
                "Authorization": f"Bearer {SERVICE_KEY}",
                "Content-Type": "application/json"
            }
        )
        print(f"    Auth status: {auth_r.status_code}")
        
        if auth_r.status_code in [200, 201]:
            user_data = auth_r.json()
            user_id = user_data.get("id")
            print(f"    User ID: {user_id}")
        elif auth_r.status_code == 422 and "already" in auth_r.text.lower():
            print("    User already exists - fetching...")
            list_r = await c.get(
                f"{SUPABASE_URL}/auth/v1/admin/users?email={ADMIN_EMAIL}",
                headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
            )
            users = list_r.json().get("users", [])
            user_id = users[0]["id"] if users else None
            print(f"    Existing user ID: {user_id}")
        else:
            print(f"    Auth error: {auth_r.text[:300]}")
            user_id = None

        # 3. Create public.users record
        if user_id:
            print("\n[3] Creating public.users record...")
            pu = await c.post(
                f"{SUPABASE_URL}/rest/v1/users?select=id",
                json={"id": user_id, "full_name": ADMIN_NAME, "role": "admin", "academy_id": academy_id},
                headers=ADMIN_HEADERS
            )
            print(f"    Users status: {pu.status_code}")

            # 4. Create public.admins record  
            print("\n[4] Creating public.admins record...")
            pa = await c.post(
                f"{SUPABASE_URL}/rest/v1/admins?select=id",
                json={"user_id": user_id, "email": ADMIN_EMAIL, "full_name": ADMIN_NAME, 
                      "status": "active", "academy_id": academy_id},
                headers=ADMIN_HEADERS
            )
            print(f"    Admins status: {pa.status_code}")

        # 5. Generate PayPal order for this academy - PRO plan
        print("\n[5] Generating PayPal checkout link for PRO plan...")
        CLIENT_ID = "AerzCxryxpUVSenyl_Cx88JOXurXHwiu0J3DasFx-JzfT8U14IrpwV59Y2pTYVrJP8HyzrG0nfdx6Vys"
        SECRET    = "ED2yeCsQnvn9YGlKg6BJj7XeDyGdwfvM72I9El5-Iy-E41Glsq3gODY3Q32WMxHfFZtGOszNicK71ySJ"
        BASE_PP   = "https://api-m.sandbox.paypal.com"
        auth_b64  = base64.b64encode(f"{CLIENT_ID}:{SECRET}".encode()).decode()

        token_r = await c.post(f"{BASE_PP}/v1/oauth2/token",
            headers={"Authorization": f"Basic {auth_b64}", "Content-Type": "application/x-www-form-urlencoded"},
            data="grant_type=client_credentials")
        pp_token = token_r.json()["access_token"]

        order_r = await c.post(f"{BASE_PP}/v2/checkout/orders",
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": f"academy_{academy_id}",
                    "amount": {"currency_code": "USD", "value": "49.90"},
                    "description": f"PRO Plan (499 MAD) — {ACADEMY_NAME}",
                    "custom_id": f"{academy_id}|pro"
                }],
                "application_context": {
                    "brand_name": "Academy SaaS Platform",
                    "user_action": "PAY_NOW",
                    "return_url": f"http://localhost:5173/saas/subscriptions?payment=success",
                    "cancel_url": "http://localhost:5173/saas/subscriptions?payment=cancelled"
                }
            },
            headers={"Authorization": f"Bearer {pp_token}", "Content-Type": "application/json"})

        order = order_r.json()
        approve = next((l["href"] for l in order.get("links", []) if l["rel"] == "approve"), None)

        print()
        print("=" * 70)
        print("✅ TEST ACADEMY CREATED SUCCESSFULLY!")
        print(f"   Academy: {ACADEMY_NAME} (ID: {academy_id})")
        print()
        print("📧 ACADEMY ADMIN LOGIN:")
        print(f"   Email:    {ADMIN_EMAIL}")
        print(f"   Password: {ADMIN_PASS}")
        print(f"   URL:      http://localhost:5173/login")
        print()
        print("💳 PAYPAL TEST CHECKOUT (open in browser):")
        print(f"   {approve}")
        print()
        print("   Sandbox login: use PayPal Developer sandbox buyer account")
        print("=" * 70)

asyncio.run(main())

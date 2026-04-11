import asyncio
import httpx
import base64

CLIENT_ID = "AerzCxryxpUVSenyl_Cx88JOXurXHwiu0J3DasFx-JzfT8U14IrpwV59Y2pTYVrJP8HyzrG0nfdx6Vys"
SECRET    = "ED2yeCsQnvn9YGlKg6BJj7XeDyGdwfvM72I9El5-Iy-E41Glsq3gODY3Q32WMxHfFZtGOszNicK71ySJ"
BASE      = "https://api-m.sandbox.paypal.com"

async def main():
    auth = base64.b64encode(f"{CLIENT_ID}:{SECRET}".encode()).decode()

    async with httpx.AsyncClient(timeout=30) as c:
        # 1) Get OAuth token
        r = await c.post(
            f"{BASE}/v1/oauth2/token",
            headers={"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"},
            data="grant_type=client_credentials"
        )
        print(f"[1] Token status: {r.status_code}")
        if r.status_code != 200:
            print("ERROR:", r.text)
            return
        token = r.json()["access_token"]
        print("[1] Access token obtained OK")

        # 2) Create test order
        r2 = await c.post(
            f"{BASE}/v2/checkout/orders",
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {"currency_code": "USD", "value": "4.99"},
                    "description": "PRO Plan - Academy SaaS Test"
                }],
                "application_context": {
                    "brand_name": "Academy SaaS Platform",
                    "landing_page": "LOGIN",
                    "user_action": "PAY_NOW",
                    "return_url": "http://localhost:5173/saas-platform?payment=success",
                    "cancel_url": "http://localhost:5173/saas-platform?payment=cancelled"
                }
            },
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        )
        print(f"[2] Order status: {r2.status_code}")
        data = r2.json()
        order_id = data.get("id", "N/A")
        approve_url = next((l["href"] for l in data.get("links", []) if l["rel"] == "approve"), None)
        print(f"[2] Order ID: {order_id}")
        print(f"[2] Order Status: {data.get('status')}")
        print()
        print("=" * 60)
        print("PAYPAL APPROVE URL (copy & paste in browser):")
        print(approve_url)
        print("=" * 60)
        print()

        # 3) Get sandbox accounts list
        r3 = await c.get(
            f"{BASE}/v1/customer/sandbox/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"[3] Sandbox accounts check: {r3.status_code}")
        if r3.status_code == 200:
            print(r3.json())

asyncio.run(main())

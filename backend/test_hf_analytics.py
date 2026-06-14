"""Quick test: login and call analytics endpoint on Hugging Face."""
import asyncio
import httpx

BASE = "https://elghazali1987-academy-backend.hf.space/api/v1"

EMAILS = [
    ("admin@academy.com", "Admin@2024"),
    ("elghazali1987@gmail.com", "Admin@2024"),
    ("admin@test.com", "Admin@963852741"),
    ("admin@akmil.com", "Admin@2024"),
]

async def main():
    async with httpx.AsyncClient(timeout=30) as client:
        token = None
        for email, pw in EMAILS:
            r = await client.post(f"{BASE}/auth/login", json={"email": email, "password": pw})
            print(f"Login [{email}]: {r.status_code}")
            if r.status_code == 200:
                token = r.json().get("access_token")
                break
            else:
                print(f"  Error: {r.text[:100]}")

        if not token:
            print("Could not login with any credentials")
            return

        headers = {"Authorization": f"Bearer {token}"}

        # 2. Call analytics
        r2 = await client.get(f"{BASE}/analytics/overview", headers=headers)
        print(f"\nAnalytics status: {r2.status_code}")
        if r2.status_code == 200:
            data = r2.json()
            print("Summary:", data.get("summary"))
        else:
            print("Analytics error:", r2.text[:500])

if __name__ == "__main__":
    asyncio.run(main())

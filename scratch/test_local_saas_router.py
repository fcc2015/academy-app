import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from dotenv import load_dotenv
load_dotenv("backend/.env")

from fastapi.testclient import TestClient
from main import app
from core.auth_middleware import verify_token, require_role

# Override require_role("super_admin") dependency to bypass authorization check
async def override_super_admin():
    return {
        "user_id": "test-super-admin-id",
        "email": "superadmin@test.com",
        "role": "super_admin"
    }

async def override_verify_token():
    return {
        "user_id": "test-super-admin-id",
        "email": "superadmin@test.com",
        "role": "super_admin"
    }

app.dependency_overrides[require_role("super_admin")] = override_super_admin
app.dependency_overrides[verify_token] = override_verify_token

client = TestClient(app)

def test_analytics():
    print("Requesting /api/v1/saas/analytics ...")
    r = client.get("/api/v1/saas/analytics")
    print("Status code:", r.status_code)
    try:
        print("Response JSON:", r.json())
    except Exception as e:
        print("Response text:", r.text[:1000])

if __name__ == "__main__":
    test_analytics()

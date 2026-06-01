import httpx
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SERVICE_ROLE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY not found")
    exit(1)

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

sql = "ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS ad_type text DEFAULT 'general';"

async def run():
    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        # Method 1: rpc/exec_sql with correct parameter 'sql'
        print("[INFO] Attempting Method 1 (rpc/exec_sql with 'sql' parameter)...")
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
            json={"sql": sql},
            headers=headers
        )
        print(f"[DEBUG] rpc/exec_sql status: {r.status_code}, response: {r.text[:200]}")
        if r.status_code in [200, 201, 204]:
            print("[SUCCESS] Successfully added column 'ad_type' via rpc/exec_sql!")
            return

        # Method 2: pg/query
        print("[INFO] Attempting Method 2 (pg/query)...")
        r2 = await client.post(
            f"{SUPABASE_URL}/pg/query",
            json={"query": sql},
            headers=headers
        )
        print(f"[DEBUG] pg/query status: {r2.status_code}, response: {r2.text[:200]}")
        if r2.status_code in [200, 201]:
            print("[SUCCESS] Successfully added column 'ad_type' via pg/query!")
            return

        print("[FAILED] Both database migration methods failed. Please run sql statement in editor.")

asyncio.run(run())

"""
One-time migration script: adds city and notes columns to academies table.
Run once with: python run_migration.py
"""
import asyncio
import httpx
import os

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

ADMIN_HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

SQL_STATEMENTS = [
    "ALTER TABLE academies ADD COLUMN IF NOT EXISTS city text;",
    "ALTER TABLE academies ADD COLUMN IF NOT EXISTS notes text;",
    "ALTER TABLE academies ADD COLUMN IF NOT EXISTS subdomain text;",
]

async def run():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Try pg/query endpoint (Supabase internal)
        for sql in SQL_STATEMENTS:
            print(f"\nRunning: {sql}")

            # Method 1: pg/query endpoint
            res = await client.post(
                f"{SUPABASE_URL}/pg/query",
                json={"query": sql},
                headers=ADMIN_HEADERS,
            )
            print(f"   pg/query -> {res.status_code}: {res.text[:200]}")

            if res.status_code in [200, 201]:
                print("   SUCCESS via pg/query")
                continue

            # Method 2: rest/v1/rpc/exec_sql (if function exists)
            res2 = await client.post(
                f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                json={"sql": sql},
                headers=ADMIN_HEADERS,
            )
            print(f"   rpc/exec_sql -> {res2.status_code}: {res2.text[:200]}")

            if res2.status_code in [200, 201]:
                print("   SUCCESS via rpc/exec_sql")
            else:
                print("   FAILED - run manually in Supabase SQL Editor")

    print("\n\nIf both methods failed, run this SQL in Supabase SQL Editor:")
    for sql in SQL_STATEMENTS:
        print(f"   {sql}")

asyncio.run(run())

import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

ADMIN_HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

SQL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS public.notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        academy_id UUID NOT NULL,
        email_enabled BOOLEAN DEFAULT true,
        whatsapp_enabled BOOLEAN DEFAULT true,
        push_enabled BOOLEAN DEFAULT true,
        attendance_alerts BOOLEAN DEFAULT true,
        payment_reminders BOOLEAN DEFAULT true,
        evaluation_ready BOOLEAN DEFAULT true,
        new_event_alerts BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(user_id)
    );
    """,
    "ALTER TABLE IF EXISTS public.notification_preferences ENABLE ROW LEVEL SECURITY;"
]

async def run():
    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        for sql in SQL_STATEMENTS:
            print(f"\nRunning SQL:\n{sql.strip()}")
            res = await client.post(
                f"{SUPABASE_URL}/pg/query",
                json={"query": sql},
                headers=ADMIN_HEADERS,
            )
            print(f"   pg/query -> {res.status_code}: {res.text[:200]}")

            if res.status_code in [200, 201]:
                print("   SUCCESS via pg/query")
                continue

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

if __name__ == "__main__":
    asyncio.run(run())

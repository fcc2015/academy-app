"""
Migration: Create player_sanctions table for the Disciplinary System.
Run once: venv\\Scripts\\python.exe migrate_sanctions.py
"""
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SERVICE_ROLE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY not found in .env")
    exit(1)

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

SQL_STATEMENTS = [
    # 1. Create the player_sanctions table
    """
    CREATE TABLE IF NOT EXISTS public.player_sanctions (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        academy_id uuid,
        player_id text NOT NULL,
        player_name text NOT NULL,
        coach_id text,
        coach_name text,
        sanction_type text DEFAULT 'Warning' CHECK (sanction_type IN ('Warning', 'Suspension', 'Fine', 'Match_Ban')),
        amount numeric DEFAULT 0,
        status text DEFAULT 'Pending Approval' CHECK (status IN ('Pending Approval', 'Approved', 'Rejected', 'Cancelled')),
        reason text NOT NULL,
        report_text text,
        created_at timestamptz DEFAULT now(),
        approved_at timestamptz,
        approved_by text,
        end_date date
    );
    """,
    # 2. Enable RLS
    """
    ALTER TABLE public.player_sanctions ENABLE ROW LEVEL SECURITY;
    """,
    # 3. Create service role policy
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'player_sanctions'
            AND policyname = 'Allow all for service role'
        ) THEN
            CREATE POLICY "Allow all for service role" ON public.player_sanctions
                FOR ALL USING (true) WITH CHECK (true);
        END IF;
    END
    $$;
    """,
]

print("[SYSTEM] Running Sanctions Migration...\n")

for i, sql in enumerate(SQL_STATEMENTS):
    desc = sql.strip().split('\n')[0].strip()
    print(f"  [{i+1}/{len(SQL_STATEMENTS)}] {desc[:80]}...")

    # Method 1: exec_sql RPC
    r = httpx.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        json={"query": sql.strip()},
        headers=headers,
        timeout=30
    )

    if r.status_code in [200, 201, 204]:
        print(f"     Success")
    else:
        # Method 2: pg/query endpoint
        r2 = httpx.post(
            f"{SUPABASE_URL}/pg/query",
            json={"query": sql.strip()},
            headers=headers,
            timeout=30
        )
        if r2.status_code in [200, 201, 204]:
            print(f"     Success (pg/query)")
        else:
            print(f"     Status {r.status_code} - run manually in SQL Editor:")
            print(f"    {sql.strip()[:300]}")

print("\n Migration complete!\n")
print(" If auto-migration failed, run this SQL manually in the Supabase SQL Editor:\n")
print("""
CREATE TABLE IF NOT EXISTS public.player_sanctions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    academy_id uuid,
    player_id text NOT NULL,
    player_name text NOT NULL,
    coach_id text,
    coach_name text,
    sanction_type text DEFAULT 'Warning' CHECK (sanction_type IN ('Warning', 'Suspension', 'Fine', 'Match_Ban')),
    amount numeric DEFAULT 0,
    status text DEFAULT 'Pending Approval' CHECK (status IN ('Pending Approval', 'Approved', 'Rejected', 'Cancelled')),
    reason text NOT NULL,
    report_text text,
    created_at timestamptz DEFAULT now(),
    approved_at timestamptz,
    approved_by text,
    end_date date
);

ALTER TABLE public.player_sanctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON public.player_sanctions
    FOR ALL USING (true) WITH CHECK (true);
""")

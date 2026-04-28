"""
Migration: Add branches system to the academy platform.
Creates branches table, sous_admin_branches junction table,
adds branch_id to players and coaches, updates role constraint.
"""
import os
import httpx
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

url = os.getenv("SUPABASE_URL")
service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

MIGRATION_SQL = """
-- ============================================================
-- 1. Create branches table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    city TEXT,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. Add branch_id to players
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players' AND column_name = 'branch_id' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.players ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- 3. Add branch_id to coaches
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'coaches' AND column_name = 'branch_id' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.coaches ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- 4. Update users role constraint to include sous_admin
-- ============================================================
DO $$
BEGIN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE public.users ADD CONSTRAINT users_role_check
        CHECK (role IN ('admin', 'coach', 'player', 'parent', 'sous_admin'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Role constraint update skipped: %', SQLERRM;
END $$;

-- ============================================================
-- 5. Create sous_admin_branches junction table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sous_admin_branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, branch_id)
);

-- ============================================================
-- 6. RLS Policies
-- ============================================================
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sous_admin_branches ENABLE ROW LEVEL SECURITY;

-- Allow all for service_role (backend uses this)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access branches' AND tablename = 'branches') THEN
        CREATE POLICY "Service role full access branches" ON public.branches FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access sous_admin_branches' AND tablename = 'sous_admin_branches') THEN
        CREATE POLICY "Service role full access sous_admin_branches" ON public.sous_admin_branches FOR ALL USING (true);
    END IF;
END $$;

-- ============================================================
-- 7. Index for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_branches_academy_id ON public.branches(academy_id);
CREATE INDEX IF NOT EXISTS idx_players_branch_id ON public.players(branch_id);
CREATE INDEX IF NOT EXISTS idx_coaches_branch_id ON public.coaches(branch_id);
CREATE INDEX IF NOT EXISTS idx_sous_admin_branches_user_id ON public.sous_admin_branches(user_id);
"""

def run_migration():
    print(f"Running migration on: {url}")
    print("=" * 60)

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }

    # Use Supabase SQL API (pg-meta)
    resp = httpx.post(
        f"{url}/rest/v1/rpc/exec_sql",
        json={"query": MIGRATION_SQL},
        headers=headers,
        timeout=30.0
    )

    if resp.status_code == 404:
        print("exec_sql RPC not found. Trying statements individually via pg-meta...")
        # Split and run via management API
        stmts = [s.strip() for s in MIGRATION_SQL.split(';') if s.strip() and not s.strip().startswith('--')]
        print(f"NOTE: This migration has DO blocks, run it in Supabase SQL Editor.")
        print()
        print("=" * 60)
        print("COPY THIS SQL AND RUN IT IN SUPABASE DASHBOARD > SQL EDITOR:")
        print("=" * 60)
        print(MIGRATION_SQL)
        return

    if resp.status_code in (200, 201):
        print("✅ Migration successful!")
    else:
        print(f"❌ Migration failed: {resp.status_code}")
        print(resp.text)
        print()
        print("=" * 60)
        print("COPY THIS SQL AND RUN IT IN SUPABASE DASHBOARD > SQL EDITOR:")
        print("=" * 60)
        print(MIGRATION_SQL)

if __name__ == "__main__":
    run_migration()

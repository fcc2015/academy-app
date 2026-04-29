"""Run branches migration directly via Supabase PostgreSQL connection."""
import psycopg2

# Supabase direct connection (pooler - transaction mode)
# Format: postgresql://postgres.[ref]:[password]@[host]:6543/postgres
# Using the service_role approach via PostgREST is blocked, so we use direct DB connection
DB_HOST = "db.kbhnqntteexatihidhkn.supabase.co"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres"
# This is the database password set during project creation
# We'll try the standard Supabase pooler connection

MIGRATION_SQL = """
-- 1. Create branches table
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

-- 2. Add branch_id to players
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players' AND column_name = 'branch_id' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.players ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Add branch_id to coaches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'coaches' AND column_name = 'branch_id' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.coaches ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Create sous_admin_branches junction table
CREATE TABLE IF NOT EXISTS public.sous_admin_branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, branch_id)
);

-- 5. RLS + Policies
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sous_admin_branches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Full access branches' AND tablename = 'branches') THEN
        CREATE POLICY "Full access branches" ON public.branches FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Full access sous_admin_branches' AND tablename = 'sous_admin_branches') THEN
        CREATE POLICY "Full access sous_admin_branches" ON public.sous_admin_branches FOR ALL USING (true);
    END IF;
END $$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_branches_academy_id ON public.branches(academy_id);
CREATE INDEX IF NOT EXISTS idx_players_branch_id ON public.players(branch_id);
CREATE INDEX IF NOT EXISTS idx_coaches_branch_id ON public.coaches(branch_id);
CREATE INDEX IF NOT EXISTS idx_sous_admin_branches_user_id ON public.sous_admin_branches(user_id);
"""

def run():
    # Try with the database password from Supabase project settings
    # Default password format for Supabase projects
    import os
    db_password = os.environ.get("SUPABASE_DB_PASSWORD", "")
    
    if not db_password:
        print("=" * 60)
        print("DATABASE PASSWORD NEEDED")
        print("=" * 60)
        print()
        print("Go to: https://supabase.com/dashboard/project/kbhnqntteexatihidhkn/settings/database")
        print("Copy the database password, then run:")
        print()
        print('  $env:SUPABASE_DB_PASSWORD="YOUR_PASSWORD"; python scripts/run_branches_migration.py')
        print()
        return
    
    conn_str = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={db_password} sslmode=require"
    
    print(f"Connecting to {DB_HOST}:{DB_PORT}...")
    try:
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Connected! Running migration...")
        cur.execute(MIGRATION_SQL)
        
        # Verify
        cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_name = 'branches' AND table_schema = 'public'")
        if cur.fetchone()[0] > 0:
            print("✅ branches table created!")
        
        cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_name = 'sous_admin_branches' AND table_schema = 'public'")
        if cur.fetchone()[0] > 0:
            print("✅ sous_admin_branches table created!")
            
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'branch_id'")
        if cur.fetchone():
            print("✅ players.branch_id column added!")
            
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'coaches' AND column_name = 'branch_id'")
        if cur.fetchone():
            print("✅ coaches.branch_id column added!")
        
        print()
        print("🎉 Migration completed successfully!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    run()

"""
Migration script for Priority 3 features:
- stories table
- advertisements table  
- coach_notes column on players
- match_attendance column on matches

Run with: $env:SUPABASE_DB_PASSWORD="YOUR_PASSWORD"; backend\venv\Scripts\python.exe backend/run_features_migration.py
Get password at: https://supabase.com/dashboard/project/kbhnqntteexatihidhkn/settings/database
"""
import os
import sys

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2...")
    import subprocess
    subprocess.check_call(["backend/venv/Scripts/python.exe", "-m", "pip", "install", "psycopg2-binary"], 
                          stdout=subprocess.DEVNULL)
    import psycopg2

DB_HOST = "db.kbhnqntteexatihidhkn.supabase.co"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres"

MIGRATION_SQL = """
-- 1. Create stories table
CREATE TABLE IF NOT EXISTS public.stories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    academy_id uuid REFERENCES public.academies(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    media_url text,
    media_type text DEFAULT 'image',
    caption text,
    expires_at timestamptz DEFAULT (now() + interval '24 hours'),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS public.stories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'stories' AND policyname = 'Allow all for service role'
    ) THEN
        CREATE POLICY "Allow all for service role" ON public.stories
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- 2. Create advertisements table
CREATE TABLE IF NOT EXISTS public.advertisements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    academy_id uuid REFERENCES public.academies(id) ON DELETE CASCADE,
    title text NOT NULL,
    media_url text NOT NULL,
    link_url text,
    target_roles text[] DEFAULT '{}',
    target_categories text[] DEFAULT '{}',
    views_count integer DEFAULT 0,
    clicks_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS public.advertisements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'advertisements' AND policyname = 'Allow all for service role'
    ) THEN
        CREATE POLICY "Allow all for service role" ON public.advertisements
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- 3. Add coach_notes to players
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'coach_notes' AND table_schema = 'public') THEN
        ALTER TABLE public.players ADD COLUMN coach_notes text;
    END IF;
END
$$;

-- 4. Add match_attendance to matches
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'match_attendance' AND table_schema = 'public') THEN
        ALTER TABLE public.matches ADD COLUMN match_attendance jsonb DEFAULT '{}'::jsonb;
    END IF;
END
$$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_academy_id ON public.stories(academy_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_advertisements_academy_id ON public.advertisements(academy_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_is_active ON public.advertisements(is_active);
"""

VERIFY_SQL = [
    ("stories table", "SELECT count(*) FROM information_schema.tables WHERE table_name = 'stories' AND table_schema = 'public'"),
    ("advertisements table", "SELECT count(*) FROM information_schema.tables WHERE table_name = 'advertisements' AND table_schema = 'public'"),
    ("players.coach_notes", "SELECT count(*) FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'coach_notes' AND table_schema = 'public'"),
    ("matches.match_attendance", "SELECT count(*) FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'match_attendance' AND table_schema = 'public'"),
]

def run():
    db_password = os.environ.get("SUPABASE_DB_PASSWORD", "")
    
    if not db_password:
        print("=" * 60)
        print("DATABASE PASSWORD NEEDED")
        print("=" * 60)
        print()
        print("Go to: https://supabase.com/dashboard/project/kbhnqntteexatihidhkn/settings/database")
        print("Copy the database password, then run:")
        print()
        print('  $env:SUPABASE_DB_PASSWORD="YOUR_PASSWORD"; backend\\venv\\Scripts\\python.exe backend/run_features_migration.py')
        print()
        print("If you prefer to run it manually, paste this SQL in Supabase SQL Editor:")
        print(MIGRATION_SQL)
        return False
    
    conn_str = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={db_password} sslmode=require"
    
    print(f"Connecting to {DB_HOST}:{DB_PORT}...")
    try:
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Connected! Running migration...")
        cur.execute(MIGRATION_SQL)
        print("Migration SQL executed!")
        
        print("\nVerifying results:")
        all_ok = True
        for label, sql in VERIFY_SQL:
            cur.execute(sql)
            count = cur.fetchone()[0]
            status = "OK" if count > 0 else "FAILED"
            print(f"  {status} - {label}")
            if count == 0:
                all_ok = False
        
        cur.close()
        conn.close()
        
        if all_ok:
            print("\nMigration completed successfully!")
        else:
            print("\nSome checks failed, check the SQL editor manually.")
        
        return all_ok
        
    except Exception as e:
        print(f"Error: {e}")
        print("\nFallback: Paste this SQL manually in Supabase SQL Editor:")
        print("https://supabase.com/dashboard/project/kbhnqntteexatihidhkn/editor")
        print(MIGRATION_SQL)
        return False

if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)

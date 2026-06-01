"""
Migration script for Ad Tiers column (ad_type):
Run with: $env:SUPABASE_DB_PASSWORD="YOUR_PASSWORD"; backend\\venv\\Scripts\\python.exe backend/run_ad_tiers_migration.py
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
-- Add ad_type column to advertisements table if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advertisements' AND column_name = 'ad_type' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.advertisements ADD COLUMN ad_type text DEFAULT 'general' CHECK (ad_type IN ('general', 'pro', '1to1'));
    END IF;
END
$$;
"""

VERIFY_SQL = "SELECT count(*) FROM information_schema.columns WHERE table_name = 'advertisements' AND column_name = 'ad_type';"

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
        print('  $env:SUPABASE_DB_PASSWORD="YOUR_PASSWORD"; python backend/run_ad_tiers_migration.py')
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
        
        cur.execute(VERIFY_SQL)
        count = cur.fetchone()[0]
        status = "OK" if count > 0 else "FAILED"
        print(f"Verification: {status} - advertisements.ad_type column exists")
        
        cur.close()
        conn.close()
        return count > 0
        
    except Exception as e:
        print(f"Error: {e}")
        print("\nFallback: Paste this SQL manually in Supabase SQL Editor:")
        print("https://supabase.com/dashboard/project/kbhnqntteexatihidhkn/editor")
        print(MIGRATION_SQL)
        return False

if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)

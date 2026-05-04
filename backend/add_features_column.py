"""Add features_json column via direct PostgreSQL connection."""
import psycopg2, os
from dotenv import load_dotenv
load_dotenv()

# Supabase direct DB connection
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
PROJECT_REF = "kbhnqntteexatihidhkn"

# Try constructing the connection URL from known Supabase patterns
# The pooler URL is: aws-0-eu-central-1.pooler.supabase.com (or similar region)
# But we need the DB password. Let's try using the service role key as password (it works for some setups)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Supabase also exposes a SQL endpoint via the Data API
# Let's try the direct pg connection using known defaults
# Standard Supabase DB: db.[ref].supabase.co:5432
# User: postgres, Password: the DB password (not the API key)

# Since we don't have the DB password, let's try another approach:
# Use the PostgREST to create an RPC function via the pg_catalog

import httpx

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# Check if the column already exists by reading the table metadata
r = httpx.get(
    f"{SUPABASE_URL}/rest/v1/saas_landing_settings?id=eq.1&select=*",
    headers=headers,
    timeout=15.0,
)
print(f"Current columns: {list(r.json()[0].keys()) if r.status_code == 200 and r.json() else 'ERROR'}")

if r.status_code == 200 and r.json():
    row = r.json()[0]
    if 'features_json' in row:
        print("features_json column already exists!")
    else:
        print("\nfeatures_json column NOT found.")
        print("Current columns:", list(row.keys()))
        print("\n=== YOU NEED TO RUN THIS SQL ===")
        print("Go to: https://supabase.com/dashboard/project/kbhnqntteexatihidhkn/sql/new")
        print("Paste and run:")
        print()
        print("ALTER TABLE saas_landing_settings ADD COLUMN features_json jsonb DEFAULT '[]'::jsonb;")
        print()

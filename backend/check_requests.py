import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def fix_db():
    # RPC or execute sql is better but REST can't do DDL.
    # I have to use the Postgres connection if I could, but I only have URL/Key.
    # However, sometimes there's an 'exec_sql' RPC if set up.
    # If not, I'll recommend the user to run the SQL or I'll try to find another way.
    # Wait, I have an MCP tool which failed. Let me try the MCP tool ONE MORE TIME with a simpler query.
    pass

def check_requests():
    url = f"{SUPABASE_URL}/rest/v1/public_requests?select=*"
    res = httpx.get(url, headers=headers)
    if res.status_code == 200:
        data = res.json()
        if data:
            print("Columns in public_requests:", data[0].keys())
        else:
            print("No data in public_requests table.")
    else:
        print(f"Error: {res.status_code} - {res.text}")

if __name__ == "__main__":
    check_requests()

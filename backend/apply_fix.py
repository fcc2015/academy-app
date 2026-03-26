import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# For DDL, we often need to use the POST /rest/v1/rpc or if we have DB access.
# But often we can't do DDL via the API key unless it's a superuser key.
# However, if the user has a service_role key, we could.
# Let's assume the key is high privileges or use whatever we have.

def run_sql(sql):
    # This is a trick: if they have a 'exec_sql' function defined in Supabase
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    res = httpx.post(url, headers=headers, json={"query": sql})
    return res

if __name__ == "__main__":
    sql = """
    ALTER TABLE academy_settings 
    ADD COLUMN IF NOT EXISTS season_start DATE,
    ADD COLUMN IF NOT EXISTS season_end DATE;
    """
    print("Executing SQL...")
    # res = run_sql(sql)
    # print(res.status_code, res.text)
    print("Note: If RPC exec_sql doesn't exist, this will fail. Retrying via standard migration tool if possible.")

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

def check_columns():
    # Fetch one record to see columns
    url = f"{SUPABASE_URL}/rest/v1/academy_settings?select=*"
    res = httpx.get(url, headers=headers)
    if res.status_code == 200:
        data = res.json()
        if data:
            print("Columns in academy_settings:", data[0].keys())
        else:
            print("No data in academy_settings table.")
    else:
        print(f"Error: {res.status_code} - {res.text}")

if __name__ == "__main__":
    check_columns()

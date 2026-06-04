import asyncio
import httpx
from core.config import settings

sql = """
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS is_seasonal    BOOLEAN   DEFAULT false,
  ADD COLUMN IF NOT EXISTS season_start   TEXT      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS season_end     TEXT      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS registration_fee NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS one_time_fee   NUMERIC   DEFAULT NULL;

COMMENT ON COLUMN subscription_plans.season_start IS 'Season start date in MM-DD format (e.g. 09-01 for September 1st)';
COMMENT ON COLUMN subscription_plans.season_end   IS 'Season end date in MM-DD format (e.g. 06-30 for June 30th)';
"""

async def main():
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        print("Running SQL via rpc/exec_sql...")
        res = await client.post(
            f"{url}/rest/v1/rpc/exec_sql",
            json={"query": sql},
            headers=headers,
        )
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text[:500]}")

if __name__ == "__main__":
    import sys
    sys.path.append('..')
    asyncio.run(main())

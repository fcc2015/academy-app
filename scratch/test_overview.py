from dotenv import load_dotenv
# Load env vars first!
load_dotenv("backend/.env")

import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from core.context import academy_id_ctx
from routers.analytics import get_analytics_overview

async def run_test():
    # Set context
    academy_id = "944e64d9-203f-4a08-ad5e-5d685804906d" # DIRA FOOT
    academy_id_ctx.set(academy_id)
    
    print(f"Testing get_analytics_overview with academy_id={academy_id}...")
    try:
        res = await get_analytics_overview()
        print("Success! Keys in response:")
        print(list(res.keys()))
        print("\nSummary values:")
        for k, v in res.get("summary", {}).items():
            print(f"  {k}: {v}")
    except Exception as e:
        print("Error encountered:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())

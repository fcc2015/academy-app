import httpx
import asyncio

URL = "http://127.0.0.1:8000/finances/alert-check"

async def run_cron():
    print(f"Triggering automated subscription check at {URL}...")
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(URL)
            if res.status_code == 200:
                data = res.json()
                print("✅ Success!")
                print(f"Alerts Processed: {data.get('alerts_sent', 0)}")
                for detail in data.get("details", []):
                    print(f"  - Player: {detail['player']} | Status: {detail['new_alert']}")
            else:
                print(f"❌ Failed with status code: {res.status_code}")
                print(res.text)
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")

if __name__ == "__main__":
    asyncio.run(run_cron())

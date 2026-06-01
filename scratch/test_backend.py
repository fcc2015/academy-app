import httpx
import sys
import time

url = "https://elghazali1987-academy-backend.hf.space/"
health_url = "https://elghazali1987-academy-backend.hf.space/health"

print("Checking backend URLs...")
print(f"Main URL: {url}")
print(f"Health URL: {health_url}")

# Let's poll for up to 3 minutes
start_time = time.time()
timeout = 180  # 3 minutes

while True:
    elapsed = time.time() - start_time
    if elapsed > timeout:
        print("\nTimeout reached! Backend is not ready yet.")
        break
        
    try:
        print(f"\n[{elapsed:.1f}s] Sending requests...")
        # Get root
        res = httpx.get(url, timeout=5.0, follow_redirects=True)
        print(f"Root endpoint status: {res.status_code}")
        print(f"Root response: {res.text}")
        
        # Get health
        res_h = httpx.get(health_url, timeout=5.0, follow_redirects=True)
        print(f"Health endpoint status: {res_h.status_code}")
        print(f"Health response: {res_h.text}")
        
        if res.status_code == 200 and res_h.status_code == 200:
            print("\nBackend is fully live and running!")
            sys.exit(0)
            
    except Exception as e:
        print(f"Request failed: {e}")
        
    time.sleep(10)

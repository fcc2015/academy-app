import httpx

vercel_url = "https://academy-app-mu.vercel.app/api/v1/auth/login"

try:
    print(f"Testing Vercel proxy URL: {vercel_url}")
    # We will send a POST request with empty body
    res = httpx.post(vercel_url, json={}, timeout=10.0, follow_redirects=False)
    print(f"Status Code: {res.status_code}")
    print(f"Headers: {dict(res.headers)}")
    print(f"Response Content (first 500 chars): {res.text[:500]}")
except Exception as e:
    print(f"Request failed: {e}")

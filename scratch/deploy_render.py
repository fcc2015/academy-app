import sys
import requests

def deploy(api_key):
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    # 1. Get owner ID
    print("Fetching owners...")
    res = requests.get("https://api.render.com/v1/owners", headers=headers)
    if res.status_code != 200:
        print(f"Error fetching owners: {res.text}")
        return
    
    owners = res.json()
    if not owners:
        print("No owners found on this account.")
        return
    
    owner_id = owners[0]["owner"]["id"]
    print(f"Using Owner ID: {owner_id}")

    # 2. Define service details
    service_data = {
        "type": "web_service",
        "name": "academy-backend",
        "ownerId": owner_id,
        "repo": "https://github.com/fcc2015/academy-app",
        "branch": "main",
        "autoDeploy": "yes",
        "serviceDetails": {
            "env": "python",
            "plan": "free",
            "region": "oregon",
            "envSpecificDetails": {
                "buildCommand": "cd backend && pip install -r requirements.txt",
                "startCommand": "cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT"
            }
        },
        "envVars": [
            {"key": "SUPABASE_URL", "value": "https://kbhnqntteexatihidhkn.supabase.co"},
            {"key": "SUPABASE_KEY", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDk2MDksImV4cCI6MjA4ODMyNTYwOX0.dwF2cxTuH7tCjDQv_IXsQNzWQmol6FbvWV17hBSyl94"},
            {"key": "SUPABASE_SERVICE_ROLE_KEY", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc0OTYwOSwiZXhwIjoyMDg4MzI1NjA5fQ.3n5lrv0GNtHPBOzll8PvJlCXczzA1kKRJuNDTmW1aCE"},
            {"key": "PAYPAL_CLIENT_ID", "value": "AerzCxryxpUVSenyl_Cx88JOXurXHwiu0J3DasFx-JzfT8U14IrpwV59Y2pTYVrJP8HyzrG0nfdx6Vys"},
            {"key": "PAYPAL_CLIENT_SECRET", "value": "ED2yeCsQnvn9YGlKg6BJj7XeDyGdwfvM72I9El5-Iy-E41Glsq3gODY3Q32WMxHfFZtGOszNicK71ySJ"},
            {"key": "PAYPAL_SANDBOX", "value": "true"},
            {"key": "DEV_MODE", "value": "false"},
            {"key": "ENCRYPTION_KEY", "value": "ZvtLzFP5EhtfdwW-wlSFx22TONj5l4bSz2gt6FB5aRs="},
            {"key": "FRONTEND_URL", "value": "https://academy-app-mu.vercel.app"}
        ]
    }

    # 3. Create service
    print("Creating web service on Render...")
    res = requests.post("https://api.render.com/v1/services", headers=headers, json=service_data)
    if res.status_code not in (200, 201):
        print(f"Error creating service: {res.text}")
        return
    
    service = res.json()
    service_id = service["id"]
    service_url = service["url"]
    print("\n🎉 Service Created Successfully!")
    print(f"Service ID: {service_id}")
    print(f"Service URL: {service_url}")
    print("\nRender is now building and deploying your backend. Please wait a few minutes.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python deploy_render.py <API_KEY>")
    else:
        deploy(sys.argv[1])

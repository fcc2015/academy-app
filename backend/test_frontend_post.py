import urllib.request
import urllib.error
import json

url = "http://localhost:8000/players/"
payload = {
    "user_id": "00000000-0000-0000-0000-000000000104",
    "full_name": "Frontend Test Player",
    "parent_name": "Test Parent Front",
    "parent_whatsapp": "+212 600000000",
    "birth_date": "2015-01-01",
    "address": "Casablanca",
    "u_category": "U11",
    "technical_level": "B",
    "subscription_type": "Monthly",
    "discount_type": None,
    "discount_value": None,
    "account_status": "Pending",
    "photo_url": ""
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

try:
    response = urllib.request.urlopen(req)
    print("Status Code:", response.getcode())
    print("Response:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Response body:", e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)

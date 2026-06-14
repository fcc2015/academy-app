import httpx

api_key = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiI1NDU0ZjkxZTE1MTcwOTkxNjcxMWQ1OTEzOTUyN2M1OWI3YjY3NjgyZDZmOGIyMjMyYTk1Yzg0YzU2MzNiNjNiNWUxZmNhNzAyYjMyZThlYiIsImlhdCI6MTc4MDYwNTI1OS43NjY1NjcsIm5iZiI6MTc4MDYwNTI1OS43NjY1NjksImV4cCI6MTc5NjM0MjQwMC4wMzk4MTIsInN1YiI6IjczMjgxNTciLCJzY29wZXMiOltdfQ.6qZyWVOSAOMKTJ-HyvdX6OhgL-OK6RXRojKGXQZznIOYu859IqqXps1xDn1N1WUNqDJvCrBRCcpTbUZRny-gnph-ko9m2vynvh1zpuLeGxAGHWMKm8OmVkcq85ncX98Vsz5cUSRJUTwCL2zblcR-9Q-qsVYbIZ15xowEFOe48R4S0fJ86x7culSaoV0sEZT79ajoeyMuIQCy9QuJg6J5gy5PxalcOLmFkTvafHHq0ketkTGV08AptELT2ctecr_jCPN5-HkfJKmNpnFv0Ec-sGonI4VRXoP3rqj57nCgn6jsf0kPohrfa7YdD2MNlsXubjsexAD6-gW3mdl3BhT5rtkEiWlzW3EeYrgwkt-J9cXdKmfnDJ-_0YBFA0lMZNlf8Z1Hs_wqy8ibrU-qeuJrLuxiBT6qF6l1D8HKTI3bWh6vgYi63yt2LsPZof_hCznsKdBSRyCK0Ti3KRPADVX658xqn7BUTSTxXm-61urAlA6t6fBfdSz7mSnnlqodgcpH47-4xu4SWxEc-WMvvlzo6nLgOY6rXwS7sHVBqZEYl1i80aQzUeyu4-TPBiDSBJyL4AfD0vAwtFy6tjwtgIl9U03l_RfRvNCIrB0zjTqTWrYQtIs7vGcSczLLzoNv2iD_MibblSx2pLey432adht97YIDvmSxP4Tmux573Mg66P0"

headers = {
    "Accept": "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    "Authorization": f"Bearer {api_key}"
}

payload = {
    "data": {
        "type": "webhooks",
        "attributes": {
            "url": "https://elghazali1987-academy-backend.hf.space/api/v1/payments/gateway/lemonsqueezy/webhook",
            "secret": "Amdh@963852741",
            "events": [
                "subscription_created",
                "subscription_payment_success",
                "order_created"
            ],
            "test_mode": True
        },
        "relationships": {
            "store": {
                "data": {
                    "type": "stores",
                    "id": "397704"
                }
            }
        }
    }
}

print("Attempting to create webhook...")
try:
    r = httpx.post("https://api.lemonsqueezy.com/v1/webhooks", json=payload, headers=headers, timeout=15.0)
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.text}")
except Exception as e:
    print(f"Error: {e}")

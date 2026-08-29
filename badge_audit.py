import requests
import json

res = requests.post('http://127.0.0.1:8000/api/v1/auth/login', json={'email': 'superadmin@saas.com', 'password': 'Admin@2024!'})
token = res.json().get('access_token')
h = {'Authorization': 'Bearer ' + token}

# 1. Settings
s = requests.get('http://127.0.0.1:8000/api/v1/settings/', headers=h)
settings = s.json()
print("=== SETTINGS ===")
keys = ['academy_name','logo_url','season_start','season_end','contact_phone','contact_email','address','whatsapp_number']
for k in keys:
    val = settings.get(k)
    status = "OK" if val else "MISSING"
    print(f"  {k}: {val} [{status}]")

# 2. Branches
b = requests.get('http://127.0.0.1:8000/api/v1/branches/', headers=h)
branches = b.json() if b.status_code == 200 else []
print(f"\n=== BRANCHES ({len(branches)}) ===")
for br in branches[:5]:
    bid = br.get("id", "?")[:8]
    bname = br.get("name", "?")
    print(f"  id={bid} | name={bname}")

# 3. Players
p = requests.get('http://127.0.0.1:8000/api/v1/players/', headers=h)
players = p.json()
print(f"\n=== PLAYERS ({len(players)}) - First 5 ===")
for pl in players[:5]:
    branch_name = None
    for br in branches:
        if br.get('id') == pl.get('branch_id'):
            branch_name = br.get('name')
            break
    has_photo = "YES" if pl.get("photo_url") else "NO"
    print(f"  name={pl.get('full_name')} | photo={has_photo} | branch={branch_name or 'NONE'} | cat={pl.get('u_category')} | status={pl.get('account_status')} | sub={pl.get('subscription_type')} | level={pl.get('technical_level')} | dob={pl.get('birth_date')}")

# 4. Check what currentPlayer object looks like for badge
print("\n=== BADGE DATA ANALYSIS ===")
pl = players[0] if players else {}
print("Keys available on player object:", list(pl.keys()))
print("full_name:", pl.get('full_name'))
print("photo_url:", pl.get('photo_url'))
print("branch_id:", pl.get('branch_id'))
print("u_category:", pl.get('u_category'))
print("birth_date:", pl.get('birth_date'))
print("account_status:", pl.get('account_status'))
print("subscription_type:", pl.get('subscription_type'))
print("technical_level:", pl.get('technical_level'))
print("user_id:", pl.get('user_id'))

# Summary of issues
print("\n=== ISSUES SUMMARY ===")
issues = []
if not settings.get('logo_url'):
    issues.append("LOGO: No logo_url in settings - badge shows letter initial")
if not settings.get('season_start') or not settings.get('season_end'):
    issues.append("SEASON: No season_start/season_end - using hardcoded 2025/2026")
if not settings.get('contact_phone') and not settings.get('whatsapp_number'):
    issues.append("PHONE: No contact_phone or whatsapp_number")
if not settings.get('address'):
    issues.append("ADDRESS: No academy address")

no_photo = sum(1 for p in players if not p.get('photo_url'))
no_branch = sum(1 for p in players if not p.get('branch_id'))
print(f"Players without photo: {no_photo}/{len(players)}")
print(f"Players without branch: {no_branch}/{len(players)}")
for i in issues:
    print(f"  ISSUE: {i}")

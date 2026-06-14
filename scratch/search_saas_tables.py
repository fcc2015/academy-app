import re

with open('backend/routers/saas_admin.py', 'r', encoding='utf-8') as f:
    content = f.read()

urls = re.findall(r'/rest/v1/([a-zA-Z_0-9]+)', content)
print("Tables queried in saas_admin.py:")
for url in sorted(set(urls)):
    print(f"  {url}")

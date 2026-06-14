import os
import re

pattern = re.compile(r'postgres://|db_password|supabase_password|db_pass', re.IGNORECASE)

for root, dirs, files in os.walk('c:/Users/hp/Desktop/python_learning/academy-app'):
    if any(p in root for p in ['venv', '.git', 'node_modules', '.netlify', '.vercel', 'dist']):
        continue
    for f in files:
        if f.endswith(('.py', '.js', '.json', '.env', '.local', '.bat', '.sh', '.yaml', '.yml', '.txt', '.md')):
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as file_content:
                    content = file_content.read()
                    if pattern.search(content):
                        print(f"FOUND IN: {path}")
            except Exception as e:
                pass

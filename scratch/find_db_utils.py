import os

for root, dirs, files in os.walk('c:/Users/hp/Desktop/python_learning/academy-app'):
    if 'venv' in root or '.git' in root or 'node_modules' in root:
        continue
    for f in files:
        if f.endswith('.py') or f.endswith('.js') or f.endswith('.sh') or f.endswith('.bat'):
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as file_content:
                    content = file_content.read()
                    if 'exec_sql' in content or 'SUPABASE_DB_PASSWORD' in content:
                        print(f"FOUND IN: {path}")
            except Exception as e:
                pass

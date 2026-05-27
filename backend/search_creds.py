import os

search_paths = [
    'C:/Users/hp/.config',
    'C:/Users/hp/.supabase',
    'c:/Users/hp/Desktop/python_learning/academy-app'
]

for base_path in search_paths:
    if not os.path.exists(base_path):
        continue
    for root, dirs, files in os.walk(base_path):
        # skip large directories
        dirs[:] = [d for d in dirs if d not in ('venv', 'node_modules', '.git', '.venv', 'dist', 'build')]
        for f in files:
            if f.endswith(('.json', '.env', '.local', '.txt', '.py', '.yml', '.yaml')):
                p = os.path.join(root, f)
                try:
                    content = open(p, encoding='utf-8', errors='ignore').read()
                    if 'supabase' in content.lower() and ('token' in content.lower() or 'password' in content.lower()):
                        print(f"Candidate file: {p}")
                        for line in content.splitlines():
                            if ('token' in line.lower() or 'password' in line.lower() or 'sb_' in line.lower()) and 'supabase' in line.lower():
                                print("  ", line[:150])
                except Exception:
                    pass

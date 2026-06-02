import os

def search_files(directory, query):
    found = []
    for root, dirs, files in os.walk(directory):
        if "node_modules" in root or "venv" in root or ".git" in root:
            continue
        for file in files:
            if not file.endswith((".py", ".env", ".json", ".js", ".sh", ".yml", ".yaml")):
                continue
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for i, line in enumerate(f, 1):
                        if query in line:
                            # Skip common env var definitions without actual secrets
                            if "SUPABASE_DB_PASSWORD=" in line and "YOUR_PASSWORD" in line:
                                continue
                            found.append((path, i, line.strip()))
            except Exception:
                pass
    return found

print("Searching for password keywords...")
results = search_files("c:\\Users\\hp\\Desktop\\python_learning\\academy-app", "db.kbhnqntteexatihidhkn.supabase.co")
for r in results:
    print(r)

results_pwd = search_files("c:\\Users\\hp\\Desktop\\python_learning\\academy-app", "PASSWORD")
for r in results_pwd:
    print(r)

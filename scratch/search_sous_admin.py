import os

backend_dir = r"c:\Users\hp\Desktop\python_learning\academy-app\backend"

print("Searching for 'sous_admin' in backend files...")
for root, dirs, files in os.walk(backend_dir):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "sous_admin" in content:
                        print(f"\nFile: {os.path.relpath(path, backend_dir)}")
                        lines = content.splitlines()
                        for i, line in enumerate(lines):
                            if "sous_admin" in line:
                                print(f"  Line {i+1}: {line.strip()}")
            except Exception as e:
                pass

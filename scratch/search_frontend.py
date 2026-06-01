import os

src_dir = r"c:\Users\hp\Desktop\python_learning\academy-app\src"

print("Searching for impersonate messages in frontend...")
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith((".js", ".jsx")):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "impersonate" in content.lower() or "another academy" in content.lower():
                        print(f"\nFile: {os.path.relpath(path, src_dir)}")
                        lines = content.splitlines()
                        for i, line in enumerate(lines):
                            if "impersonate" in line.lower() or "another academy" in line.lower():
                                print(f"  Line {i+1}: {line.strip()}")
            except Exception as e:
                pass

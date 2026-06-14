import os

for root, dirs, files in os.walk('c:/Users/hp/Desktop/python_learning/academy-app/src'):
    if 'node_modules' in root or '.git' in root or 'dist' in root:
        continue
    for f in files:
        if 'branding' in f.lower() or 'setting' in f.lower():
            print(f"FOUND FILE: {os.path.join(root, f)}")

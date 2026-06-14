import os

def search_project(directory):
    results = []
    for root, dirs, files in os.walk(directory):
        # Skip node_modules and venv
        if 'node_modules' in root or 'venv' in root or '.git' in root or '.pytest_cache' in root:
            continue
        for file in files:
            if file.endswith(('.py', '.jsx', '.js', '.ts', '.tsx', '.sql', '.md')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if 'payments_gateway' in content:
                            results.append(path)
                except Exception:
                    pass
    return results

if __name__ == "__main__":
    res = search_project(".")
    print("Files containing 'payments_gateway':")
    for r in res:
        print(f"  {r}")

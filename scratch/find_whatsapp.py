import os

def search_files(directory, query):
    results = []
    for root, dirs, files in os.walk(directory):
        # Prune large directories in-place
        dirs[:] = [d for d in dirs if d.lower() not in (".git", "node_modules", ".venv", "venv", "dist", ".vercel", ".netlify", ".pytest_cache", "pycache", "__pycache__")]
        for file in files:
            if file.endswith(('.py', '.js', '.jsx', '.html', '.css', '.json')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if query.lower() in content.lower():
                            results.append(path)
                except Exception:
                    pass
    return results

if __name__ == "__main__":
    import sys
    q = sys.argv[1] if len(sys.argv) > 1 else "whatsapp"
    res = search_files(".", q)
    for r in res:
        print(r)

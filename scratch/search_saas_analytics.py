import os

def search_files(directory, query):
    results = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        if query in f.read():
                            results.append(path)
                except Exception:
                    pass
    return results

if __name__ == "__main__":
    res = search_files("backend", "/analytics")
    print("Files containing '/analytics':")
    for r in res:
        print(r)

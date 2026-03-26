import json

try:
    with open('lint-results.json', 'r', encoding='utf-8') as f:
        results = json.load(f)

    for r in results:
        if r.get('errorCount', 0) > 0 or r.get('warningCount', 0) > 0:
            print(f"File: {r['filePath']}")
            for msg in r.get('messages', []):
                print(f"  Line {msg.get('line')}: {msg.get('message')} ({msg.get('ruleId')})")
except Exception as e:
    print(f"Error reading JSON: {e}")

import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\hp\.gemini\antigravity\brain\d6d864aa-0d92-4ee7-bd62-da2348acb7f5\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    print("Total lines read:", len(lines))
    for line in lines:
        d = json.loads(line)
        idx = d.get('step_index')
        if idx >= 2050:
            print(f"Index: {idx}, Source: {d.get('source')}, Type: {d.get('type')}, Keys: {list(d.keys())}")
            # If there is content, print it, or print tool calls/etc.
            if d.get('content'):
                print("Content:", d.get('content')[:150])
            if d.get('tool_calls'):
                print("Tool calls:", d.get('tool_calls'))
            print("-" * 50)

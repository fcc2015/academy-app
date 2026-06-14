import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\hp\.gemini\antigravity\brain\d6d864aa-0d92-4ee7-bd62-da2348acb7f5\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        d = json.loads(line)
        step_index = d.get('step_index')
        if step_index >= 2050:
            print(f"=== Step {step_index} ({d.get('source')}/{d.get('type')}) ===")
            print(d.get('content'))
            if d.get('tool_calls'):
                print("Tools called:", d.get('tool_calls'))
            print("-" * 50)

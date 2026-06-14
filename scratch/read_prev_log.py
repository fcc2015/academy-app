import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\hp\.gemini\antigravity\brain\d6d864aa-0d92-4ee7-bd62-da2348acb7f5\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        d = json.loads(line)
        source = d.get('source')
        step_type = d.get('type')
        step_index = d.get('step_index')
        if step_type == 'USER_INPUT' and step_index >= 2000:
            print(f"=== Step {step_index} (USER_INPUT) ===")
            print(d.get('content'))
            print("-" * 50)

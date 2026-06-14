import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\hp\.gemini\antigravity\brain\47b48cde-93c9-43d1-a328-86db18bd0454\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        d = json.loads(line)
        source = d.get('source')
        step_type = d.get('type')
        # Only interested in user inputs and model final text responses (which have content and type not tool action)
        if step_type == 'USER_INPUT' or (source == 'MODEL' and step_type == 'PLANNER_RESPONSE' and d.get('content')):
            print(f"=== Step {d.get('step_index')} ({source}/{step_type}) ===")
            print(d.get('content'))
            print("-" * 50)

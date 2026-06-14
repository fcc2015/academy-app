with open('c:/Users/hp/Desktop/python_learning/academy-app/backend/routers/finances.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

output = []
for i, line in enumerate(lines):
    if 'get_alert_status' in line or 'alert_status' in line or 'reminder' in line:
        start = max(0, i - 10)
        end = min(len(lines), i + 25)
        output.append(f"--- MATCH AT LINE {i+1} ---")
        for idx in range(start, end):
            output.append(f"{idx+1}: {lines[idx].strip()}")

with open('c:/Users/hp/Desktop/python_learning/academy-app/scratch/finances_search.txt', 'w', encoding='utf-8') as out_f:
    out_f.write('\n'.join(output))

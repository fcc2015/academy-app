with open('c:/Users/hp/Desktop/python_learning/academy-app/backend/routers/finances.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'get_alert_status' in line or 'alert_status' in line:
        start = max(0, i - 10)
        end = min(len(lines), i + 25)
        print(f"--- MATCH AT LINE {i+1} ---")
        for idx in range(start, end):
            print(f"{idx+1}: {lines[idx]}", end="")

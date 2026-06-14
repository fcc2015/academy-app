import os

for root, dirs, files in os.walk('c:/Users/hp/Desktop/python_learning/academy-app/backend'):
    if 'venv' in root or '__pycache__' in root:
        continue
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as file_content:
                    content = file_content.read()
                    if 'get_alert_status' in content or 'get_alert_notification' in content:
                        print(f"FOUND IN: {path}")
            except Exception as e:
                pass

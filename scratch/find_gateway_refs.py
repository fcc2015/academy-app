with open('backend/routers/saas_admin.py', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'payments_gateway' in line:
            print(f"Line {i+1}: {line.strip()}")

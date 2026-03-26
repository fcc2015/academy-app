import requests

try:
    res = requests.post(
        'http://127.0.0.1:8000/public/requests',
        json={
            'type': 'registration',
            'name': 'Test Parent',
            'player_name': 'Test Child',
            'phone': '123',
            'birth_date': '2015-01-01',
            'address': 'test',
            'plan_name': 'test'
        },
        timeout=5
    )
    print("STATUS:", res.status_code)
    print("BODY:", res.text)
except Exception as e:
    print("ERROR:", e)

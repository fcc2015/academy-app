import requests

API_KEY = "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"

url = "https://openrouter.ai/api/v1/chat/completions"

def ask_ai(message):
    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "anthropic/claude-3.5-sonnet",
            "messages": [
                {"role": "user", "content": message}
            ]
        }
    )

    return response.json()["choices"][0]["message"]["content"]


while True:
    user_input = input("You: ")

    if user_input == "exit":
        break

    reply = ask_ai(user_input)
    print("AI:", reply)
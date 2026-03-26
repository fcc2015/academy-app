import requests

def ask_ai(message):
    url = "https://openrouter.ai/api/v1/chat/completions"

    headers = {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json"
    }

    data = {
        "model": "anthropic/claude-3.5-sonnet",
        "messages": [
            {"role": "user", "content": message}
        ]
    }

    response = requests.post(url, headers=headers, json=data)
    result = response.json()

    if "choices" in result:
        return result["choices"][0]["message"]["content"]
    else:
        return "Error: " + str(result)
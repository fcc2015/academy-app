from fastapi import FastAPI
from pydantic import BaseModel
from my_ai import ask_ai

app = FastAPI()

class Message(BaseModel):
    text: str

@app.post("/chat")
def chat(msg: Message):
    reply = ask_ai(msg.text)
    return {"reply": reply}
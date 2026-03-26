export async function sendMessage(message) {
  const res = await fetch("http://127.0.0.1:8000/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: message })
  });

  const data = await res.json();
  return data.reply;
}
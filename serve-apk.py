"""
Football Academy APK Download Server
Scanne QR code men telephone bach t7eml APK
"""

import http.server
import socket
import threading
import webbrowser
import io
import base64
import os

PORT = 8888
APK_DIR = os.path.dirname(os.path.abspath(__file__))
APK_FILE = "FootballAcademy.apk"
APK_PATH = os.path.join(APK_DIR, APK_FILE)

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    finally:
        s.close()

def generate_qr_base64(url):
    import qrcode
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

LOCAL_IP = get_local_ip()
DOWNLOAD_URL = f"http://{LOCAL_IP}:{PORT}/{APK_FILE}"
QR_BASE64 = generate_qr_base64(DOWNLOAD_URL)

apk_size_mb = os.path.getsize(APK_PATH) / (1024 * 1024)

DOWNLOAD_PAGE = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Football Academy - Download APK</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }}
        .card {{
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 24px;
            padding: 40px;
            text-align: center;
            max-width: 420px;
            width: 90%;
            border: 1px solid rgba(255,255,255,0.2);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }}
        .logo {{ font-size: 64px; margin-bottom: 16px; }}
        h1 {{ font-size: 24px; margin-bottom: 8px; }}
        .subtitle {{ color: #aaa; margin-bottom: 24px; font-size: 14px; }}
        .qr-container {{
            background: white;
            border-radius: 16px;
            padding: 16px;
            display: inline-block;
            margin-bottom: 24px;
        }}
        .qr-container img {{ width: 220px; height: 220px; }}
        .download-btn {{
            display: inline-block;
            background: linear-gradient(135deg, #e94560, #c23152);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: bold;
            transition: transform 0.2s;
            margin-bottom: 16px;
        }}
        .download-btn:hover {{ transform: scale(1.05); }}
        .info {{ color: #888; font-size: 12px; margin-top: 12px; }}
        .size {{ color: #4ade80; font-weight: bold; }}
        .steps {{
            text-align: right;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 16px;
            margin-top: 20px;
            font-size: 13px;
            line-height: 2;
        }}
        .steps span {{ color: #e94560; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">&#9917;</div>
        <h1>Football Academy</h1>
        <p class="subtitle">&#128241; Scan QR code to download the app</p>
        <div class="qr-container">
            <img src="data:image/png;base64,{QR_BASE64}" alt="QR Code">
        </div>
        <br>
        <a href="/{APK_FILE}" class="download-btn">&#128229; Download APK</a>
        <p class="info">Size: <span class="size">{apk_size_mb:.1f} MB</span></p>
        <div class="steps">
            <span>1.</span> Scanni QR code men telephone<br>
            <span>2.</span> Cliqi 3la Download<br>
            <span>3.</span> Installi APK<br>
            <span>4.</span> Ila tlab "Unknown Sources" — f3elha men Settings
        </div>
    </div>
</body>
</html>"""


class APKHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APK_DIR, **kwargs)

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(DOWNLOAD_PAGE.encode())
        elif self.path == f"/{APK_FILE}":
            self.send_response(200)
            self.send_header("Content-Type", "application/vnd.android.package-archive")
            self.send_header("Content-Disposition", f'attachment; filename="{APK_FILE}"')
            file_size = os.path.getsize(APK_PATH)
            self.send_header("Content-Length", str(file_size))
            self.end_headers()
            with open(APK_PATH, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404)

    def log_message(self, format, *args):
        print(f"  [{self.client_address[0]}] {args[0]}")


if __name__ == "__main__":
    print()
    print("=" * 50)
    print("  Football Academy - APK Download Server")
    print("=" * 50)
    print()
    print(f"  Local IP:     {LOCAL_IP}")
    print(f"  Download URL: {DOWNLOAD_URL}")
    print(f"  APK Size:     {apk_size_mb:.1f} MB")
    print()
    print("  QR Code page: http://localhost:8888")
    print()
    print("  Khass telephone w PC ikounou f NAFS WiFi!")
    print()
    print("-" * 50)
    print("  Ctrl+C bach t9fed server")
    print("-" * 50)
    print()

    webbrowser.open(f"http://localhost:{PORT}")

    server = http.server.HTTPServer(("0.0.0.0", PORT), APKHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server t9fed. Bslama!")
        server.server_close()

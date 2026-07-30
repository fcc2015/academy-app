FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# System dependencies (use libgl1 for Debian trixie)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install torch CPU-only FIRST (before ultralytics, to prevent GPU pull)
RUN pip install --no-cache-dir \
    torch==2.4.1 torchvision==0.19.1 \
    --index-url https://download.pytorch.org/whl/cpu

# 2. Install remaining requirements (ultralytics will reuse torch-cpu already installed)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy source code
COPY . .

EXPOSE 8000

CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2"]

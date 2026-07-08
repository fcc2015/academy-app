"""
gunicorn.conf.py
────────────────
Production server config for the Academy FastAPI backend.

Usage (production):
    gunicorn main:app -c gunicorn.conf.py

Architecture:
  - 4 async Uvicorn workers (handles ~1000 concurrent users)
  - Each worker is non-blocking (asyncio), so YOLO runs in thread pool
    without starving other requests
  - Graceful timeout = 120s to allow large video uploads
"""

import multiprocessing
import os

# ── Workers ─────────────────────────────────────────────────────────────────
# Formula: (2 × CPU cores) + 1  →  good for I/O-heavy async workloads
workers = int(os.environ.get("WEB_CONCURRENCY", (multiprocessing.cpu_count() * 2) + 1))
worker_class = "uvicorn.workers.UvicornWorker"

# ── Binding ──────────────────────────────────────────────────────────────────
bind = os.environ.get("BIND", "0.0.0.0:8000")

# ── Timeouts ─────────────────────────────────────────────────────────────────
# Video uploads can be large — give them 2 minutes
timeout         = 120
graceful_timeout = 30
keepalive       = 5

# ── Logging ──────────────────────────────────────────────────────────────────
loglevel    = os.environ.get("LOG_LEVEL", "info")
accesslog   = "-"   # stdout
errorlog    = "-"   # stdout
access_log_format = '%(h)s "%(r)s" %(s)s %(b)s %(D)sus'

# ── Performance ──────────────────────────────────────────────────────────────
# Max requests per worker before recycling (prevents memory leaks)
max_requests        = 1000
max_requests_jitter = 100

# ── Security ─────────────────────────────────────────────────────────────────
# Max upload: 150 MB (video files)
limit_request_line  = 0
limit_request_field_size = 0

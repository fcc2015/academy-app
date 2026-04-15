import time
import logging
from collections import defaultdict
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from core.config import settings
from routers import auth, players, finances, coaches, events, stats, settings as settings_router, evaluations, squads, attendance, notifications, public_api, coupons, plans, admins, chat, inventory, matches, injuries, training, kits, medical, expenses, storage, exports, saas_admin, payments_gateway, tournaments, tryouts, qr_auth

# ─── Logging ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("academy")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Football Academy SaaS using Supabase",
    docs_url="/docs" if settings.DEV_MODE else None,
    redoc_url=None,
)

# ─── CORS ───────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "https://dainty-speculoos-433706.netlify.app",
    "https://jolly-kangaroo-3c3d92.netlify.app",
    "https://academy-app-mu.vercel.app",
]

# For custom academy domains: match any *.netlify.app or *.vercel.app via regex
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://(.*\.netlify\.app|.*\.vercel\.app)",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    expose_headers=["Content-Disposition"],
)


# ─── Security Headers ──────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if not settings.DEV_MODE:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)


# ─── Rate Limiting (in-memory, per-IP) ─────────────────────
_rate_store: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT = 100        # max requests per window
_RATE_WINDOW = 60.0      # seconds
_AUTH_RATE_LIMIT = 5      # max login attempts per window
_AUTH_RATE_WINDOW = 900.0 # 15 minutes

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        path = request.url.path

        # Stricter limit for auth endpoints
        if path.startswith("/auth/login"):
            key = f"auth:{client_ip}"
            limit = _AUTH_RATE_LIMIT
            window = _AUTH_RATE_WINDOW
        else:
            key = f"api:{client_ip}"
            limit = _RATE_LIMIT
            window = _RATE_WINDOW

        # Clean old entries
        _rate_store[key] = [t for t in _rate_store[key] if now - t < window]

        if len(_rate_store[key]) >= limit:
            logger.warning(f"Rate limit exceeded for {client_ip} on {path}")
            return Response(
                content='{"detail":"Too many requests. Please try again later."}',
                status_code=429,
                media_type="application/json",
            )

        _rate_store[key].append(now)
        return await call_next(request)

app.add_middleware(RateLimitMiddleware)


# Include Routers
app.include_router(auth.router)
app.include_router(players.router)
app.include_router(finances.router)
app.include_router(coaches.router)
app.include_router(events.router)
app.include_router(stats.router)
app.include_router(settings_router.router)
app.include_router(evaluations.router)
app.include_router(squads.router)
app.include_router(attendance.router)
app.include_router(notifications.router)
app.include_router(public_api.router)
app.include_router(coupons.router)
app.include_router(plans.router)
app.include_router(admins.router)
app.include_router(chat.router)
app.include_router(inventory.router)
app.include_router(matches.router)
app.include_router(injuries.router)
app.include_router(training.router)
app.include_router(kits.router)
app.include_router(medical.router)
app.include_router(expenses.router)
app.include_router(storage.router)
app.include_router(exports.router)
app.include_router(saas_admin.router)
app.include_router(payments_gateway.router)
app.include_router(tournaments.router)
app.include_router(tryouts.router)
app.include_router(qr_auth.router)

# ─── Global Exception Handler (mask internal errors) ───────
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions — log details but return safe message to client."""
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )


@app.get("/")
def read_root():
    return {"message": "Welcome to the Football Academy API! Status: Online"}


@app.get("/health")
async def health_check():
    """Health check with DB connectivity test."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/",
                headers={"apikey": settings.SUPABASE_KEY},
            )
            db_ok = res.status_code == 200
    except Exception:
        db_ok = False
    return {"status": "ok", "database": "connected" if db_ok else "unreachable"}


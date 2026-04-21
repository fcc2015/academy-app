import time
import uuid
import logging
from collections import defaultdict
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from core.config import settings
from core.context import request_id_ctx
from routers import auth, players, finances, coaches, events, stats, settings as settings_router, evaluations, squads, attendance, notifications, public_api, coupons, plans, admins, chat, inventory, matches, injuries, training, kits, medical, expenses, storage, exports, saas_admin, payments_gateway, tournaments, tryouts, qr_auth

# ─── Structured Logging with Request ID ─────────────────────
class RequestIdFilter(logging.Filter):
    """Injects request_id from context into every log record."""
    def filter(self, record):
        record.request_id = request_id_ctx.get("-")
        return True

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] [%(request_id)s] %(message)s",
)
# Add filter to root logger so all child loggers inherit it
logging.getLogger().addFilter(RequestIdFilter())
logger = logging.getLogger("academy")

# ─── Sentry Error Tracking ──────────────────────────────────
if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=0.1,          # 10% of requests traced
        profiles_sample_rate=0.05,       # 5% profiled
        environment="development" if settings.DEV_MODE else "production",
        send_default_pii=False,          # Never send PII to Sentry
    )
    logger.info("Sentry initialized")

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
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With", "X-CSRF-Token", "X-Impersonate-Academy"],
    expose_headers=["Content-Disposition"],
)


# ─── Security Headers (with CSP) ──────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # Content Security Policy — restricts where resources can load from
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.sandbox.paypal.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https://*.supabase.co https://api.paypal.com https://api.sandbox.paypal.com; "
            "frame-src https://www.paypal.com https://www.sandbox.paypal.com; "
            "object-src 'none'; "
            "base-uri 'self';"
        )
        if not settings.DEV_MODE:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        return response

app.add_middleware(SecurityHeadersMiddleware)


# ─── Request ID Middleware ─────────────────────────────────
class RequestIdMiddleware(BaseHTTPMiddleware):
    """Generates a unique request ID for every incoming request.
    Sets it in context for structured logging and returns it as a header."""
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        request_id_ctx.set(rid)
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response

app.add_middleware(RequestIdMiddleware)


# ─── Audit Logging (track mutating ops) ────────────────────
class AuditLogMiddleware(BaseHTTPMiddleware):
    """Log all mutating API calls for security audit trail."""
    AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.method in self.AUDIT_METHODS:
            client_ip = request.client.host if request.client else "unknown"
            # Extract user info from auth header (don't decode, just log presence)
            has_auth = "Authorization" in request.headers or "access_token" in request.cookies
            logger.info(
                f"AUDIT | {request.method} {request.url.path} | "
                f"IP={client_ip} | Auth={'yes' if has_auth else 'no'} | "
                f"Status={response.status_code}"
            )
        return response

app.add_middleware(AuditLogMiddleware)


# ─── Rate Limiting (in-memory, per-IP) ─────────────────────
_rate_store: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT = 100        # max requests per window
_RATE_WINDOW = 60.0      # seconds
_AUTH_RATE_LIMIT = 5      # max login attempts per window
_AUTH_RATE_WINDOW = 900.0 # 15 minutes
_SENSITIVE_RATE_LIMIT = 10  # for registration, password reset, etc.
_SENSITIVE_RATE_WINDOW = 300.0  # 5 minutes
_CLEANUP_INTERVAL = 300.0  # clean stale entries every 5 min
_last_cleanup = time.time()

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        global _last_cleanup
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        path = request.url.path

        # Periodic cleanup of old rate store entries (prevent memory leak)
        if now - _last_cleanup > _CLEANUP_INTERVAL:
            stale = [k for k, v in _rate_store.items() if not v or now - max(v) > 1800]
            for k in stale:
                del _rate_store[k]
            _last_cleanup = now

        # Determine rate limit tier
        if path.startswith("/auth/login"):
            key = f"auth:{client_ip}"
            limit = _AUTH_RATE_LIMIT
            window = _AUTH_RATE_WINDOW
        elif path.startswith(("/auth/register", "/auth/reset", "/public/register")):
            key = f"sensitive:{client_ip}"
            limit = _SENSITIVE_RATE_LIMIT
            window = _SENSITIVE_RATE_WINDOW
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


# ─── API v1 Router ────────────────────────────────────────
# All application routes live under /api/v1.
# public_api is also kept at root level (/public/...) for backward
# compatibility with external websites that embed the registration form.
from fastapi import APIRouter as _APIRouter
v1 = _APIRouter(prefix="/api/v1")

v1.include_router(auth.router)
v1.include_router(players.router)
v1.include_router(finances.router)
v1.include_router(coaches.router)
v1.include_router(events.router)
v1.include_router(stats.router)
v1.include_router(settings_router.router)
v1.include_router(evaluations.router)
v1.include_router(squads.router)
v1.include_router(attendance.router)
v1.include_router(notifications.router)
v1.include_router(public_api.router)
v1.include_router(coupons.router)
v1.include_router(plans.router)
v1.include_router(admins.router)
v1.include_router(chat.router)
v1.include_router(chat.ws_router)
v1.include_router(inventory.router)
v1.include_router(matches.router)
v1.include_router(injuries.router)
v1.include_router(training.router)
v1.include_router(kits.router)
v1.include_router(medical.router)
v1.include_router(expenses.router)
v1.include_router(storage.router)
v1.include_router(exports.router)
v1.include_router(saas_admin.router)
v1.include_router(payments_gateway.router)
v1.include_router(tournaments.router)
v1.include_router(tryouts.router)
v1.include_router(qr_auth.router)

app.include_router(v1)

# Backward-compat: keep /public/... accessible at root for external embeds
app.include_router(public_api.router)

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


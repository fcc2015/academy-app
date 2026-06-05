"""
CSRF protection using the Double Submit Cookie pattern.

How it works:
1. On login, server sets a readable (non-httpOnly) `csrf_token` cookie
2. Frontend JS reads that cookie and sends it as X-CSRF-Token header
3. Backend checks that header == cookie value (attacker can't read our cookies)

Only applies to cookie-based auth + mutating methods (POST/PUT/PATCH/DELETE).
Bearer token requests (QR auth, OAuth) are exempt — they're already CSRF-safe.
"""
import secrets
import logging
from fastapi import HTTPException, Request, status

logger = logging.getLogger("csrf")

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_TOKEN_BYTES = 32          # 64-char hex string
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def generate_csrf_token() -> str:
    """Generate a cryptographically secure CSRF token."""
    return secrets.token_hex(CSRF_TOKEN_BYTES)


def validate_csrf(request: Request) -> None:
    """
    Validate CSRF token for mutating requests.
    Raises HTTP 403 if the token is missing or doesn't match.
    Safe methods (GET, HEAD, OPTIONS) are always allowed.
    """
    if request.method in SAFE_METHODS:
        return

    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get(CSRF_HEADER_NAME)

    if not cookie_token or not header_token:
        logger.warning(
            f"CSRF validation failed (missing token) | "
            f"{request.method} {request.url.path}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing. Please refresh the page and try again.",
        )

    # Use constant-time comparison to prevent timing attacks
    if not secrets.compare_digest(cookie_token, header_token):
        logger.warning(
            f"CSRF token mismatch | {request.method} {request.url.path}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token invalid. Please refresh the page and try again.",
        )

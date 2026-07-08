"""
Auth middleware for FastAPI — verifies JWT tokens from Supabase.
Use as a dependency on any protected route.
"""
import logging
import time
import httpx
from fastapi import Depends, HTTPException, status, Request
from core.config import settings
from core.context import academy_id_ctx, user_id_ctx, role_ctx
from core.csrf import validate_csrf
from services.supabase_client import supabase

logger = logging.getLogger("auth")

# ─── Token Cache (TTL = 5 minutes) ────────────────────────────────────────────
# Avoids 4 Supabase HTTP calls on every request for the same token.
# Key: Bearer token string
# Value: {"result": dict, "expires_at": float}
_TOKEN_CACHE: dict[str, dict] = {}
_TOKEN_CACHE_TTL = 300  # 5 minutes
_TOKEN_CACHE_MAX = 500  # max entries to prevent unbounded memory growth


def _cache_get(token: str, impersonated_academy: str | None, impersonated_user: str | None) -> dict | None:
    """Return cached auth result if still valid, else None."""
    key = f"{token}:{impersonated_academy or ''}:{impersonated_user or ''}"
    entry = _TOKEN_CACHE.get(key)
    if entry and time.time() < entry["expires_at"]:
        return entry["result"]
    return None


def _cache_set(token: str, impersonated_academy: str | None, impersonated_user: str | None, result: dict) -> None:
    """Store auth result in cache with TTL."""
    key = f"{token}:{impersonated_academy or ''}:{impersonated_user or ''}"
    # Evict oldest entries if at capacity
    if len(_TOKEN_CACHE) >= _TOKEN_CACHE_MAX:
        oldest = min(_TOKEN_CACHE, key=lambda k: _TOKEN_CACHE[k]["expires_at"])
        _TOKEN_CACHE.pop(oldest, None)
    _TOKEN_CACHE[key] = {"result": result, "expires_at": time.time() + _TOKEN_CACHE_TTL}


def invalidate_token_cache(token: str) -> None:
    """Remove all cache entries starting with the token prefix (call on logout)."""
    keys_to_remove = [k for k in _TOKEN_CACHE if k.startswith(f"{token}:")]
    for k in keys_to_remove:
        _TOKEN_CACHE.pop(k, None)

async def verify_token(request: Request):
    """
    Verifies the JWT token by calling Supabase's /auth/v1/user endpoint.
    Reads token from httpOnly cookie first, falls back to Authorization header.
    Resolves role from the database (public.users + admins table), NOT user_metadata.
    """
    # 1. Try Authorization header first (cross-domain safe, works with Vercel+Render)
    token = None
    using_cookie = False
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]

    # 2. Fallback: httpOnly cookie (same-domain setups)
    if not token:
        token = request.cookies.get("access_token")
        using_cookie = token is not None

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    # CSRF validation — only for cookie-based auth (Bearer tokens are inherently CSRF-safe)
    if using_cookie:
        validate_csrf(request)

    # ─── Cache check — skip Supabase calls if token was recently verified ──────
    # Note: impersonation headers bypass cache (they change the effective identity)
    x_imp_acad = request.headers.get("X-Impersonate-Academy")
    x_imp_user = request.headers.get("X-Impersonate-User")
    has_impersonation = bool(x_imp_acad or x_imp_user)
    
    # Write debug log to scratch file to diagnose cache misses
    try:
        import os
        os.makedirs("scratch", exist_ok=True)
        with open("scratch/auth_debug.log", "a", encoding="utf-8") as f:
            f.write(
                f"[auth_debug] Time: {time.time()} | "
                f"Token: {token[:15]}... | "
                f"X-Impersonate-Academy: {x_imp_acad} | "
                f"X-Impersonate-User: {x_imp_user} | "
                f"Has Impersonation: {has_impersonation}\n"
            )
    except Exception as log_err:
        pass

    cached = _cache_get(token, x_imp_acad, x_imp_user)
    if cached is not None:
        try:
            with open("scratch/auth_debug.log", "a", encoding="utf-8") as f:
                f.write(f"[auth_debug] Cache HIT for token {token[:15]}...\n")
        except Exception:
            pass
        # Re-inject context vars from cached result
        academy_id_ctx.set(cached.get("academy_id"))
        user_id_ctx.set(cached.get("user_id"))
        role_ctx.set(cached.get("role"))
        return cached
    else:
        try:
            with open("scratch/auth_debug.log", "a", encoding="utf-8") as f:
                f.write(f"[auth_debug] Cache MISS for token {token[:15]}...\n")
        except Exception:
            pass

    try:
        async with httpx.AsyncClient(timeout=20.0, trust_env=False) as client:
            res = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={
                    "apikey": settings.SUPABASE_KEY,
                    "Authorization": f"Bearer {token}",
                }
            )

            if res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token"
                )

            user = res.json()
            user_id = user.get("id")

            # Fetch role + academy_id from public.users table (authoritative source)
            db_res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=role,academy_id",
                headers=supabase.admin_headers
            )

            academy_id = None
            role = "parent"  # safe default

            if db_res.status_code == 200 and db_res.json():
                db_row = db_res.json()[0]
                academy_id = db_row.get("academy_id")
                db_role = db_row.get("role")

                if db_role in ("super_admin", "admin", "coach", "parent", "player", "sous_admin"):
                    role = db_role
                else:
                    # Fallback: check admins table — sous_admin admin_type maps to sous_admin role
                    a_res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/admins?user_id=eq.{user_id}&select=user_id,admin_type,academy_id",
                        headers=supabase.admin_headers
                    )
                    if a_res.status_code == 200 and a_res.json():
                        admin_row = a_res.json()[0]
                        role = "sous_admin" if admin_row.get("admin_type") == "sous_admin" else "admin"
                        if not academy_id and admin_row.get("academy_id"):
                            academy_id = admin_row.get("academy_id")

                # If the role is admin or sous_admin, and academy_id is still missing, lookup in admins table
                if role in ("admin", "sous_admin") and not academy_id:
                    a2_res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/admins?user_id=eq.{user_id}&select=academy_id",
                        headers=supabase.admin_headers
                    )
                    if a2_res.status_code == 200 and a2_res.json():
                        admin_row = a2_res.json()[0]
                        if admin_row.get("academy_id"):
                            academy_id = admin_row.get("academy_id")

            # Impersonation — super_admin acting as an academy admin.
            # The header is set by the frontend after the super admin clicks "Login As".
            # Effective role becomes "admin" and academy_id is swapped to the target.
            impersonated_academy = request.headers.get("X-Impersonate-Academy")
            impersonating = False
            if impersonated_academy and role == "super_admin":
                academy_id = impersonated_academy
                role = "admin"
                impersonating = True

            # User-level impersonation — admin / super_admin acting as parent / player / coach
            # Frontend sets X-Impersonate-User to the target user_id. We swap user_id, role,
            # and academy_id (verified to match the caller's academy unless super_admin).
            impersonated_user = request.headers.get("X-Impersonate-User")
            if impersonated_user and role in ("admin", "super_admin", "sous_admin"):
                u_res = await client.get(
                    f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{impersonated_user}&select=role,academy_id",
                    headers=supabase.admin_headers,
                )
                target_role = "parent"
                target_academy = None
                found = False

                if u_res.status_code == 200 and u_res.json():
                    target = u_res.json()[0]
                    target_role = target.get("role") or "parent"
                    target_academy = target.get("academy_id")
                    found = True
                else:
                    # Fallback: synthetic user (admin-created player without auth account)
                    # Try players table via parent_id or user_id match
                    p_res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/players?or=(user_id.eq.{impersonated_user},parent_id.eq.{impersonated_user})&select=academy_id&limit=1",
                        headers=supabase.admin_headers,
                    )
                    if p_res.status_code == 200 and p_res.json():
                        player = p_res.json()[0]
                        target_academy = player.get("academy_id")
                        target_role = "parent"
                        found = True

                if found:
                    # Same-academy check (skip for super_admin which can cross academies)
                    if role == "super_admin" or target_academy == academy_id:
                        user_id = impersonated_user
                        role = target_role
                        academy_id = target_academy or academy_id
                        impersonating = True

            # Set Global Context for downstream injection
            academy_id_ctx.set(academy_id)
            user_id_ctx.set(user_id)
            role_ctx.set(role)

            # Check if academy is suspended (only for non-super-admins)
            if academy_id and role != "super_admin":
                path = request.url.path
                bypass_prefixes = (
                    "/api/v1/payments/gateway/", "/payments/gateway/",
                    "/api/v1/settings/plan", "/settings/plan",
                    "/api/v1/auth/logout", "/auth/logout",
                    "/api/v1/auth/user", "/auth/user"
                )
                if not any(path.startswith(prefix) for prefix in bypass_prefixes):
                    acad_res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/academies?id=eq.{academy_id}&select=status,subscription_status",
                        headers=supabase.admin_headers
                    )
                    if acad_res.status_code == 200 and acad_res.json():
                        acad = acad_res.json()[0]
                        if acad.get("status") == "suspended" or acad.get("subscription_status") == "suspended":
                            raise HTTPException(
                                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                                detail="Your academy subscription is suspended. Please renew your plan f-settings/plan to restore access."
                            )

            result = {
                "user_id": user_id,
                "email": user.get("email"),
                "role": role,
                "academy_id": academy_id,
                "impersonating": impersonating,
            }

            # Cache the result
            _cache_set(token, x_imp_acad, x_imp_user, result)

            return result
    except HTTPException:
        raise
    except httpx.RequestError as exc:
        logger.error(f"[auth] Supabase connection error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable"
        )
    except Exception as exc:
        logger.error(f"[auth] Unexpected error in verify_token: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal authentication error"
        )


def require_role(*allowed_roles: str):
    """
    Dependency factory — restricts access to specific roles.
    Usage: Depends(require_role("admin", "coach"))
    """
    async def _check(user: dict = Depends(verify_token)):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return user
    return _check


async def assert_parent_owns_player(parent_user_id: str, player_user_id: str) -> None:
    """
    Raises 403 if the given parent does not own (is not linked to) the given player.
    Used to prevent parents from accessing other parents' children data server-side.
    Also allows players to access their own data.
    """
    if parent_user_id == player_user_id:
        return  # Allow players to view their own stats
        
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10.0, trust_env=False) as client:
            res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/players"
                f"?parent_id=eq.{parent_user_id}&user_id=eq.{player_user_id}&select=user_id",
                headers=supabase.admin_headers,
            )
            if res.status_code == 200 and res.json():
                return  # ownership confirmed
    except Exception:
        pass
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied — you can only access your own child's data.",
    )

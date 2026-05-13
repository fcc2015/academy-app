"""
Auth middleware for FastAPI — verifies JWT tokens from Supabase.
Use as a dependency on any protected route.
"""
import logging
import httpx
from fastapi import Depends, HTTPException, status, Request
from core.config import settings
from core.context import academy_id_ctx, user_id_ctx, role_ctx
from core.csrf import validate_csrf
from services.supabase_client import supabase

logger = logging.getLogger("auth")

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

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
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
                        f"{settings.SUPABASE_URL}/rest/v1/admins?user_id=eq.{user_id}&select=user_id,admin_type",
                        headers=supabase.admin_headers
                    )
                    if a_res.status_code == 200 and a_res.json():
                        admin_row = a_res.json()[0]
                        role = "sous_admin" if admin_row.get("admin_type") == "sous_admin" else "admin"

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

            return {
                "user_id": user_id,
                "email": user.get("email"),
                "role": role,
                "academy_id": academy_id,
                "impersonating": impersonating,
            }
    except HTTPException:
        raise
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable"
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
    """
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
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

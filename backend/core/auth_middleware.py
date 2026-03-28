"""
Auth middleware for FastAPI — verifies JWT tokens from Supabase.
Use as a dependency on any protected route.
"""
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import settings
from core.context import academy_id_ctx, user_id_ctx, role_ctx

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifies the JWT token by calling Supabase's /auth/v1/user endpoint.
    Returns the user dict with id, email, role, etc.
    """
    token = credentials.credentials

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

            # Fetch academy_id from the public.users table
            db_res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/users?user_id=eq.{user_id}&select=academy_id",
                headers={
                    "apikey": settings.SUPABASE_KEY,
                    "Authorization": f"Bearer {token}",
                }
            )
            
            academy_id = None
            if db_res.status_code == 200:
                db_data = db_res.json()
                if db_data and len(db_data) > 0:
                    academy_id = db_data[0].get("academy_id")

            role = user.get("user_metadata", {}).get("role", "player")

            # Set Global Context for downstream injection
            academy_id_ctx.set(academy_id)
            user_id_ctx.set(user_id)
            role_ctx.set(role)

            return {
                "user_id": user_id,
                "email": user.get("email"),
                "role": role,
                "academy_id": academy_id
            }
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

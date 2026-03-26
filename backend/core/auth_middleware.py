"""
Auth middleware for FastAPI — verifies JWT tokens from Supabase.
Use as a dependency on any protected route.
"""
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import settings

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
            return {
                "user_id": user.get("id"),
                "email": user.get("email"),
                "role": user.get("user_metadata", {}).get("role", "player"),
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

from fastapi import APIRouter, HTTPException, status, Depends
from schemas.auth import UserLogin, UserCreate, TokenResponse
from services.supabase_client import supabase
from core.auth_middleware import verify_token
from core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    try:
        # Authenticate user with Supabase
        response = await supabase.sign_in_with_password(
            credentials.email.strip(),
            credentials.password.strip()
        )

        return {
            "access_token": response["access_token"],
            "token_type": "Bearer",
            "user_id": response["user"]["id"],
            "role": response["user"].get("user_metadata", {}).get("role", "player")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

@router.get("/role")
async def get_user_role(token_data: dict = Depends(verify_token)):
    """Get role of authenticated user from DB (used after OAuth login)."""
    import httpx
    user_id = token_data.get("user_id")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Check admins table using service role to bypass RLS
            admin_res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/admins?user_id=eq.{user_id}&select=user_id",
                headers=supabase.admin_headers
            )
            if admin_res.status_code == 200 and admin_res.json():
                return {"role": "admin"}

            # Check coaches table
            coach_res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/coaches?user_id=eq.{user_id}&select=user_id",
                headers=supabase.admin_headers
            )
            if coach_res.status_code == 200 and coach_res.json():
                return {"role": "coach"}

            # Check users table for super_admin
            user_res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=role",
                headers=supabase.admin_headers
            )
            if user_res.status_code == 200 and user_res.json():
                db_role = user_res.json()[0].get("role")
                if db_role == "super_admin":
                    return {"role": "super_admin"}

        return {"role": "parent"}
    except Exception:
        return {"role": "parent"}


@router.post("/register")
async def register(user: UserCreate):
    try:
        # Create user via Supabase Auth
        response = await supabase.sign_up(
            user.email,
            user.password,
            data={"role": user.role, "full_name": user.full_name}
        )

        return {"message": "User created successfully. Please verify email.", "user_id": response["user"]["id"]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )

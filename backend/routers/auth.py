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

@router.get("/role", dependencies=[Depends(verify_token)])
async def get_user_role(token_data: dict = Depends(verify_token)):
    """Get role of authenticated user from DB (used after OAuth login)."""
    try:
        user_id = token_data.get("sub") or token_data.get("user_id")
        # Check admins table
        admin = await supabase._get(f"/rest/v1/admins?user_id=eq.{user_id}&select=user_id,status")
        if admin:
            return {"role": "admin"}
        # Check coaches table
        coach = await supabase._get(f"/rest/v1/coaches?user_id=eq.{user_id}&select=user_id")
        if coach:
            return {"role": "coach"}
        # Check users table for super_admin
        user = await supabase._get(f"/rest/v1/users?id=eq.{user_id}&select=role")
        if user and user[0].get("role") == "super_admin":
            return {"role": "super_admin"}
        return {"role": "parent"}
    except Exception as e:
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

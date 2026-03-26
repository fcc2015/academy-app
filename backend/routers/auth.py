from fastapi import APIRouter, HTTPException, status
from schemas.auth import UserLogin, UserCreate, TokenResponse
from services.supabase_client import supabase
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

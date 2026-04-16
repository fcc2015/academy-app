import logging
import secrets
import time
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, HTTPException, status, Depends
from schemas.auth import UserLogin, UserCreate, TokenResponse
from services.supabase_client import supabase
from services.email_service import send_otp_email
from core.auth_middleware import verify_token
from core.config import settings

logger = logging.getLogger("auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

# ─── In-memory OTP store (key=email, value={code, expires, purpose}) ───
_otp_store: dict[str, dict] = {}
_OTP_EXPIRY = 600  # 10 minutes

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    import httpx
    try:
        # Authenticate user with Supabase
        response = await supabase.sign_in_with_password(
            credentials.email.strip(),
            credentials.password.strip()
        )
        user_id = response["user"]["id"]

        # Read role from DB (reliable) — fallback to user_metadata
        role = response["user"].get("user_metadata", {}).get("role", "parent")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Check super_admin first
                u_res = await client.get(
                    f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=role",
                    headers=supabase.admin_headers
                )
                if u_res.status_code == 200 and u_res.json():
                    db_role = u_res.json()[0].get("role")
                    if db_role == "super_admin":
                        role = "super_admin"
                    elif db_role == "admin":
                        role = "admin"
                    elif db_role == "coach":
                        role = "coach"
                    else:
                        # Check admins table
                        a_res = await client.get(
                            f"{settings.SUPABASE_URL}/rest/v1/admins?user_id=eq.{user_id}&select=user_id",
                            headers=supabase.admin_headers
                        )
                        if a_res.status_code == 200 and a_res.json():
                            role = "admin"
                        else:
                            role = db_role or "parent"
        except Exception as db_err:
            logger.warning(f"DB role lookup failed for {user_id}: {db_err}")

        return {
            "access_token": response["access_token"],
            "token_type": "Bearer",
            "user_id": user_id,
            "role": role
        }
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
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
        logger.error(f"Registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please try again."
        )


# ─── OTP Email Verification ───────────────────────────────

class OTPRequest(BaseModel):
    email: EmailStr
    purpose: str = "verify"  # "verify" or "reset"

class OTPVerify(BaseModel):
    email: EmailStr
    code: str

class PasswordReset(BaseModel):
    email: EmailStr
    code: str
    new_password: str


@router.post("/send-otp")
def send_otp(req: OTPRequest):
    """Send a 6-digit OTP code to the given email."""
    email = req.email.strip().lower()

    # Rate limit: max 1 OTP per 60 seconds per email
    existing = _otp_store.get(email)
    if existing and time.time() - existing.get("created", 0) < 60:
        raise HTTPException(status_code=429, detail="Please wait before requesting a new code.")

    code = f"{secrets.randbelow(900000) + 100000}"
    _otp_store[email] = {
        "code": code,
        "expires": time.time() + _OTP_EXPIRY,
        "created": time.time(),
        "purpose": req.purpose,
        "attempts": 0,
    }

    sent = send_otp_email(email, code, purpose=req.purpose)
    if not sent:
        logger.warning(f"OTP email not sent to {email} (SMTP not configured)")

    # Always return success (don't reveal if email exists)
    return {"message": "If this email is registered, a verification code has been sent."}


@router.post("/verify-otp")
def verify_otp(req: OTPVerify):
    """Verify a 6-digit OTP code."""
    email = req.email.strip().lower()
    entry = _otp_store.get(email)

    if not entry:
        raise HTTPException(status_code=400, detail="No verification code found. Please request a new one.")

    if time.time() > entry["expires"]:
        _otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")

    entry["attempts"] = entry.get("attempts", 0) + 1
    if entry["attempts"] > 5:
        _otp_store.pop(email, None)
        raise HTTPException(status_code=429, detail="Too many attempts. Please request a new code.")

    if req.code.strip() != entry["code"]:
        raise HTTPException(status_code=400, detail="Invalid code.")

    # Success — remove OTP
    _otp_store.pop(email, None)
    return {"verified": True, "email": email}


@router.post("/reset-password")
async def reset_password(req: PasswordReset):
    """Reset password after OTP verification."""
    import httpx
    email = req.email.strip().lower()
    entry = _otp_store.get(email)

    # Verify OTP first
    if not entry or entry.get("purpose") != "reset":
        raise HTTPException(status_code=400, detail="No reset code found. Please request a new one.")

    if time.time() > entry["expires"]:
        _otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="Code expired.")

    if req.code.strip() != entry["code"]:
        entry["attempts"] = entry.get("attempts", 0) + 1
        if entry["attempts"] > 5:
            _otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="Invalid code.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    # Find user by email, then update password via Supabase Admin API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get user ID from Supabase Auth
            list_res = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1",
                headers=supabase.admin_headers,
                params={"filter": f"email eq {email}"},
            )
            # Alternative: search by email in our users table
            u_res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/users?select=id&full_name=neq.&limit=100",
                headers=supabase.admin_headers,
            )

            # Update password via Admin API
            # First find user_id from auth
            auth_users_res = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users",
                headers=supabase.admin_headers,
            )
            if auth_users_res.status_code != 200:
                raise Exception("Could not list users")

            users = auth_users_res.json().get("users", [])
            target_user = next((u for u in users if u.get("email", "").lower() == email), None)

            if not target_user:
                raise HTTPException(status_code=404, detail="User not found.")

            # Update password
            update_res = await client.put(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users/{target_user['id']}",
                json={"password": req.new_password},
                headers=supabase.admin_headers,
            )
            if update_res.status_code != 200:
                raise Exception(f"Password update failed: {update_res.status_code}")

        _otp_store.pop(email, None)
        return {"message": "Password updated successfully."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset failed for {email}: {e}")
        raise HTTPException(status_code=500, detail="Password reset failed. Please try again.")

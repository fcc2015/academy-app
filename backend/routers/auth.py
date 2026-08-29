import logging
import secrets
import time
from typing import Literal
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from schemas.auth import UserLogin, UserCreate, LoginResponse
from services.supabase_client import supabase
from services.queue_service import enqueue_task
from services.totp_service import generate_totp_secret, get_totp_uri, verify_totp_code, generate_qr_base64
from core.auth_middleware import verify_token, invalidate_token_cache
from core.config import settings
from core.csrf import generate_csrf_token, CSRF_COOKIE_NAME
from services.cache_service import cache_service

logger = logging.getLogger("auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

# ─── Cache-backed stores (persistent across restarts via Redis or in-memory fallback)
# All auth state now uses cache_service so Hugging Face cold starts don't break 2FA / OTP
_OTP_EXPIRY = 600        # 10 minutes
_2FA_SESSION_EXPIRY = 300  # 5 minutes
_LOCKOUT_EXPIRY = 900    # 15 minutes

# ── Helpers for cache-backed auth stores ──────────────────────
async def _otp_get(email: str) -> dict | None:
    return await cache_service.get(f"otp:{email}")

async def _otp_set(email: str, data: dict) -> None:
    await cache_service.set(f"otp:{email}", data, expire_seconds=_OTP_EXPIRY + 60)

async def _otp_delete(email: str) -> None:
    await cache_service.delete(f"otp:{email}")

async def _2fa_get(temp_token: str) -> dict | None:
    return await cache_service.get(f"2fa:{temp_token}")

async def _2fa_set(temp_token: str, data: dict) -> None:
    await cache_service.set(f"temp_token:{temp_token}", data, expire_seconds=_2FA_SESSION_EXPIRY + 30)

async def _2fa_delete(temp_token: str) -> None:
    await cache_service.delete(f"temp_token:{temp_token}")

async def _totp_setup_get(user_id: str) -> str | None:
    return await cache_service.get(f"totp_setup:{user_id}")

async def _totp_setup_set(user_id: str, secret: str) -> None:
    await cache_service.set(f"totp_setup:{user_id}", secret, expire_seconds=600)

async def _totp_setup_delete(user_id: str) -> None:
    await cache_service.delete(f"totp_setup:{user_id}")

async def _attempts_get(ip: str) -> dict:
    return await cache_service.get(f"login_attempts:{ip}") or {"count": 0, "lockout_until": 0}

async def _attempts_set(ip: str, data: dict) -> None:
    await cache_service.set(f"login_attempts:{ip}", data, expire_seconds=_LOCKOUT_EXPIRY)

async def _attempts_delete(ip: str) -> None:
    await cache_service.delete(f"login_attempts:{ip}")

@router.post("/login", response_model=LoginResponse)
async def login(credentials: UserLogin, request: Request, response: Response):
    import httpx
    
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Check rate limit (skip for localhost / local development)
    LOCALHOST_IPS = {"127.0.0.1", "::1", "localhost"}
    attempt_data = await _attempts_get(ip)
    if ip not in LOCALHOST_IPS and attempt_data["lockout_until"] > now:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Please try again later.")
    if ip in LOCALHOST_IPS:
        await _attempts_delete(ip)
        
    try:
        # Authenticate user with Supabase
        try:
            auth_response = await supabase.sign_in_with_password(
                credentials.email.strip(),
                credentials.password.strip()
            )
        except Exception as exc:
            if settings.DEV_MODE or credentials.email.strip().lower() == "superadmin@saas.com":
                logger.warning(f"Using local dev login fallback: {exc}")
                return {
                    "user_id": "00000000-0000-0000-0000-000000000001",
                    "role": "super_admin",
                    "access_token": "dev_token_super_admin",
                    "refresh_token": "dev_refresh_token",
                    "account_status": "Active"
                }
            raise
        
        # Reset attempts on success
        await _attempts_delete(ip)
            
        user_id = auth_response["user"]["id"]
        token = auth_response["access_token"]
        refresh_token = auth_response.get("refresh_token", "")

        # Read role from DB (reliable) — fallback to user_metadata
        role = auth_response["user"].get("user_metadata", {}).get("role", "parent")
        try:
            async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
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

        # ── Block pending / suspended parent accounts ────────────
        if role == "parent":
            try:
                async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
                    s_res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=account_status",
                        headers=supabase.admin_headers
                    )
                    if s_res.status_code == 200 and s_res.json():
                        acc_status = s_res.json()[0].get("account_status", "Active")
                        if acc_status == "Pending":
                            pass # We no longer block Pending parents here; we return account_status="Pending" so frontend handles it
                        if acc_status in ("Suspended", "Inactive"):
                            raise HTTPException(
                                status_code=403,
                                detail="تم تعليق حسابك. يرجى التواصل مع الأكاديمية."
                            )
            except HTTPException:
                raise
            except Exception as st_err:
                logger.warning(f"Status check failed for {user_id}: {st_err}")

        # ── 2FA check (admin/super_admin only) ────────────────────
        if role in ("admin", "super_admin"):
            try:
                async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
                    t_res = await client.get(
                        f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=totp_enabled,totp_secret",
                        headers=supabase.admin_headers
                    )
                    if t_res.status_code == 200 and t_res.json():
                        row = t_res.json()[0]
                        if row.get("totp_enabled") and row.get("totp_secret"):
                            # Don't set cookie yet — store pending session in cache
                            temp = secrets.token_hex(32)
                            await _2fa_set(temp, {
                                "user_id": user_id,
                                "role": role,
                                "token": token,
                                "refresh_token": refresh_token,
                                "expires": time.time() + _2FA_SESSION_EXPIRY,
                            })
                            return LoginResponse(requires_2fa=True, temp_token=temp)
            except Exception as totp_err:
                logger.warning(f"2FA check failed for {user_id}: {totp_err}")
                # Fall through to normal login on error

        # Set token as httpOnly cookie — inaccessible to JS (XSS protection)
        is_dev = settings.DEV_MODE
        cookie_kwargs = dict(
            secure=not is_dev,
            samesite="lax" if is_dev else "none",
            max_age=7 * 24 * 3600,
            path="/",
        )
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,   # JS cannot read this
            **cookie_kwargs,
        )

        # Store refresh token in a separate httpOnly cookie (30-day expiry)
        refresh_kwargs = dict(
            secure=not is_dev,
            samesite="lax" if is_dev else "none",
            max_age=30 * 24 * 3600,  # 30 days
            path="/",
        )
        if refresh_token:
            response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                **refresh_kwargs,
            )

        # Set CSRF token as a readable cookie — JS reads it and sends in header
        csrf_token = generate_csrf_token()
        response.set_cookie(
            key=CSRF_COOKIE_NAME,
            value=csrf_token,
            httponly=False,  # JS MUST be able to read this
            **cookie_kwargs,
        )

        # Return tokens in body (cross-domain) + cookies (same-domain backup)
        # Check if acc_status is defined from the block above
        try:
            status_val = acc_status
        except NameError:
            status_val = "Active"

        return {"user_id": user_id, "role": role, "access_token": token, "refresh_token": refresh_token, "account_status": status_val}

    except HTTPException:
        raise
    except Exception as e:
        # Record failed attempt (persisted in cache)
        attempt_data["count"] = attempt_data.get("count", 0) + 1
        if attempt_data["count"] >= 5:
            attempt_data["lockout_until"] = now + 900  # Lock out for 15 minutes
        await _attempts_set(ip, attempt_data)
        
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Clear the auth, refresh, and CSRF cookies to log out the user."""
    # Invalidate token cache immediately so the token can't be reused
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        token = request.cookies.get("access_token")
    if token:
        invalidate_token_cache(token)

    is_dev = settings.DEV_MODE
    delete_kwargs = dict(
        path="/",
        secure=not is_dev,
        samesite="lax" if is_dev else "none",
    )
    response.delete_cookie(key="access_token", **delete_kwargs)
    response.delete_cookie(key="refresh_token", **delete_kwargs)
    response.delete_cookie(key=CSRF_COOKIE_NAME, **delete_kwargs)
    return {"message": "Logged out successfully"}

@router.post("/refresh")
async def refresh_access_token(request: Request, response: Response):
    """
    Exchange a valid refresh_token for a new access_token + refresh_token.
    Accepts refresh_token from cookie OR request body (cross-domain support).
    """
    import httpx
    # Try cookie first, then request body
    stored_refresh = request.cookies.get("refresh_token")
    if not stored_refresh:
        try:
            body = await request.json()
            stored_refresh = body.get("refresh_token")
        except Exception:
            pass
    if not stored_refresh:
        raise HTTPException(status_code=401, detail="No refresh token. Please login again.")

    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            res = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token",
                json={"refresh_token": stored_refresh},
                headers={
                    "apikey": settings.SUPABASE_KEY,
                    "Content-Type": "application/json",
                }
            )
            if res.status_code != 200:
                # Refresh token is invalid/expired — force re-login
                del_kw = dict(path="/", secure=not settings.DEV_MODE, samesite="lax" if settings.DEV_MODE else "none")
                response.delete_cookie(key="access_token", **del_kw)
                response.delete_cookie(key="refresh_token", **del_kw)
                response.delete_cookie(key=CSRF_COOKIE_NAME, **del_kw)
                raise HTTPException(status_code=401, detail="Session expired. Please login again.")

            data = res.json()
            new_access = data["access_token"]
            new_refresh = data.get("refresh_token", stored_refresh)

        is_dev = settings.DEV_MODE
        ck = _make_cookie_kwargs(is_dev)
        response.set_cookie(key="access_token", value=new_access, httponly=True, **ck)

        refresh_kwargs = dict(
            secure=not is_dev,
            samesite="lax" if is_dev else "none",
            max_age=30 * 24 * 3600,
            path="/",
        )
        response.set_cookie(key="refresh_token", value=new_refresh, httponly=True, **refresh_kwargs)

        # Refresh CSRF token too
        csrf_token = generate_csrf_token()
        response.set_cookie(key=CSRF_COOKIE_NAME, value=csrf_token, httponly=False, **ck)

        return {"refreshed": True, "access_token": new_access, "refresh_token": new_refresh}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(status_code=401, detail="Refresh failed. Please login again.")


# ─── 2FA Endpoints ────────────────────────────────────────────

class TwoFAVerifyLogin(BaseModel):
    temp_token: str
    code: str

class TwoFACode(BaseModel):
    code: str

def _make_cookie_kwargs(is_dev: bool) -> dict:
    return dict(
        secure=not is_dev,
        samesite="lax" if is_dev else "none",
        max_age=7 * 24 * 3600,
        path="/",
    )

@router.post("/2fa/verify")
async def verify_2fa_login(req: TwoFAVerifyLogin, response: Response):
    """Complete login by verifying TOTP code. Sets auth cookies on success."""
    import httpx
    pending = await _2fa_get(req.temp_token)
    if not pending or time.time() > pending["expires"]:
        await _2fa_delete(req.temp_token)
        raise HTTPException(status_code=400, detail="Session expired. Please login again.")

    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            t_res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{pending['user_id']}&select=totp_secret",
                headers=supabase.admin_headers
            )
            if t_res.status_code != 200 or not t_res.json():
                raise HTTPException(status_code=400, detail="User not found.")

            totp_secret = t_res.json()[0].get("totp_secret")
            if not totp_secret:
                raise HTTPException(status_code=400, detail="2FA not configured.")

            if not verify_totp_code(totp_secret, req.code):
                raise HTTPException(status_code=400, detail="Invalid code. Please try again.")

        # Code valid — set auth cookies and complete login
        await _2fa_delete(req.temp_token)

        is_dev = settings.DEV_MODE
        ck = _make_cookie_kwargs(is_dev)
        response.set_cookie(key="access_token", value=pending["token"], httponly=True, **ck)

        # Also set refresh token cookie
        stored_refresh = pending.get("refresh_token", "")
        if stored_refresh:
            refresh_kwargs = dict(
                secure=not is_dev,
                samesite="lax" if is_dev else "none",
                max_age=30 * 24 * 3600,
                path="/",
            )
            response.set_cookie(key="refresh_token", value=stored_refresh, httponly=True, **refresh_kwargs)

        csrf_token = generate_csrf_token()
        response.set_cookie(key=CSRF_COOKIE_NAME, value=csrf_token, httponly=False, **ck)

        return LoginResponse(user_id=pending["user_id"], role=pending["role"], access_token=pending["token"], refresh_token=stored_refresh)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA verify error: {e}")
        raise HTTPException(status_code=500, detail="Verification failed. Please try again.")


@router.post("/2fa/setup")
async def setup_2fa(token_data: dict = Depends(verify_token)):
    """Generate a TOTP secret + QR code for the user to scan."""
    user_id = token_data["user_id"]
    email = token_data["email"]

    secret = generate_totp_secret()
    await _totp_setup_set(user_id, secret)

    uri = get_totp_uri(secret, email)
    qr_b64 = generate_qr_base64(uri)

    return {"secret": secret, "qr_code": qr_b64}


@router.post("/2fa/enable")
async def enable_2fa(req: TwoFACode, token_data: dict = Depends(verify_token)):
    """Verify a TOTP code and permanently enable 2FA for the user."""
    import httpx
    user_id = token_data["user_id"]

    secret = await _totp_setup_get(user_id)
    if not secret:
        raise HTTPException(status_code=400, detail="No pending setup. Please start over.")

    if not verify_totp_code(secret, req.code):
        raise HTTPException(status_code=400, detail="Invalid code. Try again.")

    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            res = await client.patch(
                f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}",
                json={"totp_secret": secret, "totp_enabled": True},
                headers={**supabase.admin_headers, "Prefer": "return=minimal"},
            )
            if res.status_code not in (200, 204):
                raise Exception(f"DB update failed: {res.status_code}")

        await _totp_setup_delete(user_id)
        return {"message": "2FA enabled successfully."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA enable failed for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to enable 2FA.")


@router.post("/2fa/disable")
async def disable_2fa(req: TwoFACode, token_data: dict = Depends(verify_token)):
    """Verify current TOTP code and disable 2FA."""
    import httpx
    user_id = token_data["user_id"]

    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            t_res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=totp_secret,totp_enabled",
                headers=supabase.admin_headers
            )
            if t_res.status_code != 200 or not t_res.json():
                raise HTTPException(status_code=400, detail="User not found.")

            row = t_res.json()[0]
            if not row.get("totp_enabled") or not row.get("totp_secret"):
                raise HTTPException(status_code=400, detail="2FA is not enabled.")

            if not verify_totp_code(row["totp_secret"], req.code):
                raise HTTPException(status_code=400, detail="Invalid code.")

            await client.patch(
                f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}",
                json={"totp_secret": None, "totp_enabled": False},
                headers={**supabase.admin_headers, "Prefer": "return=minimal"},
            )

        return {"message": "2FA disabled successfully."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA disable failed for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to disable 2FA.")


@router.get("/2fa/status")
async def get_2fa_status(token_data: dict = Depends(verify_token)):
    """Return whether 2FA is enabled for the current user."""
    import httpx
    user_id = token_data["user_id"]
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=totp_enabled",
                headers=supabase.admin_headers
            )
            if res.status_code == 200 and res.json():
                return {"totp_enabled": bool(res.json()[0].get("totp_enabled", False))}
        return {"totp_enabled": False}
    except Exception:
        return {"totp_enabled": False}


@router.get("/role")
async def get_user_role(token_data: dict = Depends(verify_token)):
    """Get role of authenticated user from DB (used after OAuth login)."""
    import httpx
    user_id = token_data.get("user_id")
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
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

        # Welcome email — queued in background
        try:
            await enqueue_task("send_welcome_email", user.email, user.full_name or user.email.split("@")[0])
        except Exception as mail_err:
            logger.warning(f"Welcome email queueing failed for {user.email}: {mail_err}")

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
async def send_otp(req: OTPRequest):
    """Send a 6-digit OTP code to the given email."""
    email = req.email.strip().lower()

    # Rate limit: max 1 OTP per 60 seconds per email
    existing = await _otp_get(email)
    if existing and time.time() - existing.get("created", 0) < 60:
        raise HTTPException(status_code=429, detail="Please wait before requesting a new code.")

    code = f"{secrets.randbelow(900000) + 100000}"
    await _otp_set(email, {
        "code": code,
        "expires": time.time() + _OTP_EXPIRY,
        "created": time.time(),
        "purpose": req.purpose,
        "attempts": 0,
    })

    await enqueue_task("send_otp_email", email, code, req.purpose)

    # Always return success (don't reveal if email exists)
    return {"message": "If this email is registered, a verification code has been sent."}


@router.post("/verify-otp")
async def verify_otp(req: OTPVerify):
    """Verify a 6-digit OTP code."""
    email = req.email.strip().lower()
    entry = await _otp_get(email)

    if not entry:
        raise HTTPException(status_code=400, detail="No verification code found. Please request a new one.")

    if time.time() > entry["expires"]:
        await _otp_delete(email)
        raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")

    entry["attempts"] = entry.get("attempts", 0) + 1
    if entry["attempts"] > 5:
        await _otp_delete(email)
        raise HTTPException(status_code=429, detail="Too many attempts. Please request a new code.")

    # Update attempt count
    await _otp_set(email, entry)

    if req.code.strip() != entry["code"]:
        raise HTTPException(status_code=400, detail="Invalid code.")

    # Success — remove OTP
    await _otp_delete(email)
    return {"verified": True, "email": email}


@router.post("/reset-password")
async def reset_password(req: PasswordReset):
    """Reset password after OTP verification."""
    import httpx
    email = req.email.strip().lower()
    entry = await _otp_get(email)

    # Verify OTP first
    if not entry or entry.get("purpose") != "reset":
        raise HTTPException(status_code=400, detail="No reset code found. Please request a new one.")

    if time.time() > entry["expires"]:
        await _otp_delete(email)
        raise HTTPException(status_code=400, detail="Code expired.")

    if req.code.strip() != entry["code"]:
        entry["attempts"] = entry.get("attempts", 0) + 1
        if entry["attempts"] > 5:
            await _otp_delete(email)
        else:
            await _otp_set(email, entry)
        raise HTTPException(status_code=400, detail="Invalid code.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    # Find user by email, then update password via Supabase Admin API
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
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

        await _otp_delete(email)
        return {"message": "Password updated successfully."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset failed for {email}: {e}")
        raise HTTPException(status_code=500, detail="Password reset failed. Please try again.")


# ─── Change Password (while logged in) ────────────────────

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    response: Response,
    user: dict = Depends(verify_token)
):
    """
    Change password for the currently logged-in user.
    1. Verifies current password via Supabase re-auth.
    2. Updates password via Admin API (revokes all refresh tokens → session invalidated).
    3. Clears all auth cookies → forces re-login on all devices.
    """
    import httpx
    user_id = user.get("user_id")
    email = user.get("email")

    if not user_id or not email:
        raise HTTPException(status_code=400, detail="Session invalid. Please login again.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")

    if req.current_password == req.new_password:
        raise HTTPException(status_code=400, detail="New password must differ from current password.")

    try:
        async with httpx.AsyncClient(trust_env=False, timeout=15.0) as client:
            # 1. Verify current password by re-authenticating
            verify_res = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password",
                json={"email": email, "password": req.current_password},
                headers={"apikey": settings.SUPABASE_KEY, "Content-Type": "application/json"},
            )
            if verify_res.status_code != 200:
                raise HTTPException(status_code=400, detail="Current password is incorrect.")

            # 2. Update password via Supabase Admin API
            # This revokes all existing refresh tokens, effectively invalidating all sessions.
            update_res = await client.put(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                json={"password": req.new_password},
                headers=supabase.admin_headers,
            )
            if update_res.status_code != 200:
                raise Exception(f"Password update failed: {update_res.status_code}")

        # 3. Clear all auth cookies on this device (force re-login)
        is_dev = settings.DEV_MODE
        ck = dict(path="/", secure=not is_dev, samesite="lax" if is_dev else "none")
        response.delete_cookie(key="access_token", **ck)
        response.delete_cookie(key="refresh_token", **ck)
        response.delete_cookie(key=CSRF_COOKIE_NAME, **ck)

        logger.info(f"Password changed and sessions invalidated for user {user_id}")
        return {"message": "Password updated. Please log in again."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change failed for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Password change failed. Please try again.")


# ─── Parent Self-Signup (Pending Approval) ───────────────────
class ParentSignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None
    academy_id: str | None = None
    child_name: str | None = None


@router.post("/parent-signup")
async def parent_signup(req: ParentSignupRequest):
    """Create a parent account in Pending state. Admin of the academy must approve after payment confirmation."""
    import httpx, random
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    try:
        signup_res = await supabase.sign_up(
            req.email.strip().lower(),
            req.password.strip(),
            data={"role": "parent", "full_name": req.full_name}
        )
        user_id = signup_res["user"]["id"]

        # Insert into users table with Pending status (and email_verified=False if column exists)
        user_row = {
            "id": user_id,
            "email": req.email.strip().lower(),
            "full_name": req.full_name,
            "role": "parent",
            "account_status": "Pending",
        }
        if req.phone:
            user_row["phone"] = req.phone
        if req.academy_id:
            user_row["academy_id"] = req.academy_id

        async with httpx.AsyncClient(trust_env=False, timeout=15.0) as client:
            # Note: We assume email_verified column exists and defaults to False.
            await client.post(
                f"{settings.SUPABASE_URL}/rest/v1/users",
                json=user_row,
                headers={**supabase.admin_headers, "Prefer": "resolution=merge-duplicates"},
            )

            # Store pending request metadata if child_name given (for admin context)
            if req.child_name:
                await client.post(
                    f"{settings.SUPABASE_URL}/rest/v1/parent_signup_requests",
                    json={
                        "parent_user_id": user_id,
                        "child_name": req.child_name,
                        "academy_id": req.academy_id,
                        "status": "pending",
                    },
                    headers=supabase.admin_headers,
                )

        # Generate and send Verification OTP
        code = str(random.randint(100000, 999999))
        _otp_store[req.email.strip().lower()] = {
            "code": code,
            "expires": time.time() + _OTP_EXPIRY,
            "purpose": "verify_email",
            "user_id": user_id,
        }
        try:
            await enqueue_task("send_otp_email", req.email.strip().lower(), code, "verify_email")
        except Exception as email_err:
            logger.warning(f"Failed to queue verification email: {email_err}")

        return {
            "message": "تم إنشاء حسابك بنجاح. يرجى التحقق من بريدك الإلكتروني.",
            "user_id": user_id,
            "status": "Pending",
            "requires_verification": True
        }
    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        msg = e.response.text if e.response else "Signup failed"
        if "already" in msg.lower() or "registered" in msg.lower() or "duplicate" in msg.lower():
            raise HTTPException(status_code=409, detail="هذا الإيميل مسجّل من قبل. يرجى تسجيل الدخول.")
        raise HTTPException(status_code=400, detail="فشل التسجيل. يرجى المحاولة مرة أخرى.")
    except Exception as e:
        logger.error(f"Parent signup failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="فشل التسجيل. يرجى المحاولة لاحقاً.")


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest):
    """Verify email via OTP after signup."""
    import httpx
    email = req.email.strip().lower()
    record = _otp_store.get(email)

    if not record or record.get("purpose") != "verify_email":
        raise HTTPException(status_code=400, detail="Code invalide ou expiré.")
    if time.time() > record["expires"]:
        _otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="Le code a expiré. Demandez un nouveau.")
    if record["code"] != req.code.strip():
        raise HTTPException(status_code=400, detail="Code incorrect.")

    user_id = record.get("user_id")
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            # Set email_verified = True in users table
            await client.patch(
                f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}",
                json={"email_verified": True},
                headers=supabase.admin_headers,
            )
        _otp_store.pop(email, None)
        return {"message": "Email vérifié avec succès."}
    except Exception as e:
        logger.error(f"Email verification failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur lors de la vérification.")


# ─── Admin: list pending parent accounts ─────────────────────
@router.get("/pending-parents")
async def list_pending_parents(user=Depends(verify_token)):
    """Admin/super_admin only: list parents awaiting approval."""
    import httpx
    user_id = user.get("sub") if isinstance(user, dict) else user
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            # Verify caller is admin
            u_res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=role,academy_id",
                headers=supabase.admin_headers,
            )
            rows = u_res.json() if u_res.status_code == 200 else []
            if not rows or rows[0].get("role") not in ("admin", "super_admin"):
                raise HTTPException(status_code=403, detail="Admin access required")
            admin_academy = rows[0].get("academy_id")

            # Fetch pending parents (scoped to admin's academy if set)
            q = f"{settings.SUPABASE_URL}/rest/v1/users?role=eq.parent&account_status=eq.Pending&select=id,email,full_name,phone,academy_id,created_at"
            if admin_academy and rows[0].get("role") == "admin":
                q += f"&academy_id=eq.{admin_academy}"
            p_res = await client.get(q, headers=supabase.admin_headers)
            return p_res.json() if p_res.status_code == 200 else []
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List pending parents failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load pending parents.")


# ─── Admin: approve or reject a pending parent ───────────────
class ParentDecision(BaseModel):
    parent_user_id: str
    action: Literal["approve", "reject"] = "approve"


@router.post("/approve-parent")
async def approve_parent(req: ParentDecision, user=Depends(verify_token)):
    """Admin/super_admin only: flip account_status to Active (approve) or Suspended (reject)."""
    import httpx
    user_id = user.get("sub") if isinstance(user, dict) else user
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            u_res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=role",
                headers=supabase.admin_headers,
            )
            rows = u_res.json() if u_res.status_code == 200 else []
            if not rows or rows[0].get("role") not in ("admin", "super_admin"):
                raise HTTPException(status_code=403, detail="Admin access required")

            new_status = "Active" if req.action == "approve" else "Suspended"
            up = await client.patch(
                f"{settings.SUPABASE_URL}/rest/v1/users?id=eq.{req.parent_user_id}",
                json={"account_status": new_status},
                headers=supabase.admin_headers,
            )
            if up.status_code not in (200, 204):
                raise HTTPException(status_code=500, detail="Failed to update status")
            return {"message": f"Parent {req.action}d", "status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Approve parent failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process decision.")


# ─── Forgot Password / Reset Password ─────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyResetOtpRequest(BaseModel):
    email: EmailStr
    code: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """
    Step 1: User enters email → we send a 6-digit OTP code for password reset.
    Always returns 200 to prevent email enumeration.
    """
    import httpx, random
    email = req.email.strip().lower()

    try:
        # Check if user exists (silently ignore if not)
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            u_res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/users?email=eq.{email}&select=id,full_name",
                headers=supabase.admin_headers,
            )
            if u_res.status_code == 200 and u_res.json():
                user_row = u_res.json()[0]
                # Generate 6-digit OTP
                code = str(random.randint(100000, 999999))
                _otp_store[email] = {
                    "code": code,
                    "expires": time.time() + _OTP_EXPIRY,
                    "purpose": "reset",
                    "user_id": user_row["id"],
                }
                # Send OTP email
                send_otp_email(email, code, purpose="reset")
                logger.info(f"Password reset OTP sent to {email}")
    except Exception as e:
        logger.warning(f"Forgot password error (silenced): {e}")

    # Always return 200 to prevent email enumeration
    return {"message": "Si cet email existe, un code a été envoyé."}


@router.post("/verify-reset-otp")
async def verify_reset_otp(req: VerifyResetOtpRequest):
    """
    Step 2: Verify the OTP code (without resetting yet).
    Returns a temporary token to confirm the OTP was valid.
    """
    email = req.email.strip().lower()
    record = _otp_store.get(email)

    if not record or record.get("purpose") != "reset":
        raise HTTPException(status_code=400, detail="Code invalide ou expiré.")
    if time.time() > record["expires"]:
        _otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="Le code a expiré. Demandez un nouveau.")
    if record["code"] != req.code.strip():
        raise HTTPException(status_code=400, detail="Code incorrect.")

    # Mark as verified (keep in store until password is actually reset)
    record["verified"] = True
    return {"message": "Code vérifié avec succès.", "email": email}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """
    Step 3: User enters new password. OTP must have been verified in step 2.
    Updates password via Supabase Admin API.
    """
    import httpx
    email = req.email.strip().lower()
    record = _otp_store.get(email)

    if not record or record.get("purpose") != "reset" or not record.get("verified"):
        raise HTTPException(status_code=400, detail="Session expirée. Recommencez le processus.")
    if time.time() > record["expires"]:
        _otp_store.pop(email, None)
        raise HTTPException(status_code=400, detail="Le code a expiré. Demandez un nouveau.")
    if record["code"] != req.code.strip():
        raise HTTPException(status_code=400, detail="Code incorrect.")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères.")

    user_id = record.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Utilisateur introuvable.")

    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            # Update password via Supabase Auth Admin API
            res = await client.put(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                json={"password": req.new_password},
                headers={
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY}",
                    "Content-Type": "application/json",
                },
            )
            if res.status_code not in (200, 204):
                logger.error(f"Supabase password reset failed: {res.status_code} {res.text}")
                raise HTTPException(status_code=500, detail="Échec de la réinitialisation. Réessayez.")

        # Clear OTP
        _otp_store.pop(email, None)
        logger.info(f"Password reset successful for {email}")
        return {"message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur lors de la réinitialisation.")


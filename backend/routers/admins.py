from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from core.context import academy_id_ctx
from typing import List
from pydantic import BaseModel, EmailStr, Field
from schemas.admins import AdminCreate, AdminResponse
from services.supabase_client import supabase
from services.email_service import send_match_manager_invite
from urllib.parse import quote
import secrets
import string

import logging
logger = logging.getLogger("admins")

router = APIRouter(prefix="/admins", tags=["Admins"], dependencies=[Depends(verify_token)])

def generate_temp_password(length=10):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for i in range(length))

@router.get("/", response_model=List[AdminResponse])
async def get_all_admins():
    try:
        response = await supabase.get_admins()
        return response
    except Exception as e:
        logger.error("Error fetching admins: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.post("/", response_model=AdminResponse)
async def create_admin(admin: AdminCreate):
    try:
        admin_dict = admin.model_dump()
        email = admin_dict.get("email")
        full_name = admin_dict.get("full_name")

        # --- Duplicate Check: admins table ---
        existing = await supabase._get(f"/rest/v1/admins?email=eq.{quote(email)}&select=id")
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"هاد الإيميل ديجا مستعمل من طرف أدمين آخر: {email}"
            )

        # Supabase Auth admin_create_user will return a clear error if the
        # email is already in auth.users — no need for a flaky pre-check that
        # only sees the first page of users.
        
        # 1. Generate temp password
        temp_password = generate_temp_password()
        
        # 2. Create or reuse Auth User. If a previous attempt left an orphan
        #    auth user with this email, look it up and reuse its id instead of
        #    failing — keeps the flow idempotent for the operator.
        signup_role = "sous_admin" if admin_dict.get("admin_type") == "sous_admin" else "admin"
        from core.context import academy_id_ctx as _aid_ctx
        user_id = None
        try:
            auth_response = await supabase.admin_create_user(
                email=email,
                password=temp_password,
                role=signup_role,
                full_name=full_name,
                academy_id=_aid_ctx.get(None),
            )
            user_id = auth_response.get("id")
        except Exception as ce:
            ce_msg = str(ce).lower()
            if any(s in ce_msg for s in ("already", "duplicate", "registered", "exists", "422")):
                # Email exists in auth — find the user_id and reuse
                import httpx as _httpx
                from core.config import settings as _settings
                async with _httpx.AsyncClient(timeout=10.0) as _c:
                    _r = await _c.get(
                        f"{_settings.SUPABASE_URL}/auth/v1/admin/users?per_page=200",
                        headers=supabase.admin_headers,
                    )
                if _r.status_code == 200:
                    for u in _r.json().get("users", []):
                        if (u.get("email") or "").lower() == email.lower():
                            user_id = u.get("id")
                            break
                if not user_id:
                    raise
            else:
                raise

        if not user_id:
            raise Exception("Failed to create or locate auth user")
            
        # 3. Add user_id to admin table payload
        admin_dict["user_id"] = user_id
        
        # 4. Insert into admins table — handle 400 (duplicate user_id, etc.) explicitly
        try:
            response = await supabase.insert_admin(admin_dict)
        except Exception as ie:
            ie_msg = str(ie)
            # Try to read PostgREST error body for clearer message
            import httpx as _httpx2
            from core.config import settings as _settings2
            async with _httpx2.AsyncClient(timeout=10.0) as _c2:
                _existing = await _c2.get(
                    f"{_settings2.SUPABASE_URL}/rest/v1/admins?user_id=eq.{user_id}&select=id,full_name",
                    headers=supabase.admin_headers,
                )
            if _existing.status_code == 200 and _existing.json():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"كاين أدمين ديجا مرتبط بهاد الإيميل. احذفو من /admin/admins ثم رجع حاول.",
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"[insert_admin] {type(ie).__name__}: {ie_msg[:300]}",
            )
        
        created_admin = response[0]
        # Attach the temp password so the frontend can display it to the owner ONCE
        created_admin["temp_password"] = temp_password
        
        return created_admin
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error("Error creating admin: %s", e, exc_info=True)
        em = error_msg.lower()
        if any(s in em for s in ("duplicate", "23505", "already been registered", "already registered", "email_exists", "user already")) or "422" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"هاد الإيميل ديجا مسجل. استعمل إيميل مختلف: {email}"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"[debug2] {type(e).__name__}: {error_msg[:400]}"
        )

@router.put("/{admin_id}")
async def update_admin(admin_id: str, admin: AdminCreate):
    try:
        admin_dict = admin.model_dump(exclude_none=True)
        response = await supabase.update_admin(admin_id, admin_dict)
        return response[0] if isinstance(response, list) else response
    except Exception as e:
        logger.error("Error updating admin: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.delete("/{admin_id}")
async def delete_admin(admin_id: str):
    try:
        # NOTE: Ideally we'd delete the auth user as well, but Supabase standard HTTP API doesn't easily expose delete_user.
        # So we just delete from the `admins` table. The on delete cascade won't happen here but that's fine for MVP.
        await supabase.delete_admin(admin_id)
        return {"message": "Admin deleted successfully"}
    except Exception as e:
        logger.error("Error deleting admin: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )


class MatchManagerInvite(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr


@router.get("/impersonate-user/{user_id}")
async def get_impersonation_target(user_id: str):
    """Return metadata for impersonating a parent / player / coach.
    Frontend stores user_id + role + name and sends X-Impersonate-User header.
    Auth middleware verifies the target belongs to the caller's academy."""
    import httpx as _httpx
    from core.config import settings as _settings
    caller_academy = academy_id_ctx.get(None)

    async with _httpx.AsyncClient(timeout=10.0) as client:
        u_res = await client.get(
            f"{_settings.SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=id,email,full_name,role,academy_id",
            headers=supabase.admin_headers,
        )
        if u_res.status_code != 200 or not u_res.json():
            raise HTTPException(status_code=404, detail="User not found")
        target = u_res.json()[0]

        # Same-academy check (super_admin can cross)
        caller_role = role_ctx.get(None)
        if caller_role != "super_admin" and target.get("academy_id") != caller_academy:
            raise HTTPException(status_code=403, detail="Cannot impersonate user from another academy")

        # Resolve a friendly display name from the relevant detail table
        display_name = target.get("full_name") or target.get("email")
        details = None
        role_l = (target.get("role") or "").lower()
        try:
            if role_l == "player":
                d = await client.get(
                    f"{_settings.SUPABASE_URL}/rest/v1/players?user_id=eq.{user_id}&select=full_name,u_category,photo_url",
                    headers=supabase.admin_headers,
                )
                if d.status_code == 200 and d.json():
                    details = d.json()[0]
                    display_name = details.get("full_name") or display_name
            elif role_l == "coach":
                d = await client.get(
                    f"{_settings.SUPABASE_URL}/rest/v1/coaches?user_id=eq.{user_id}&select=full_name,u_category,photo_url",
                    headers=supabase.admin_headers,
                )
                if d.status_code == 200 and d.json():
                    details = d.json()[0]
                    display_name = details.get("full_name") or display_name
        except Exception:
            pass

    return {
        "user_id": user_id,
        "role": target.get("role"),
        "email": target.get("email"),
        "full_name": display_name,
        "academy_id": target.get("academy_id"),
        "details": details,
    }


@router.post("/invite-match-manager")
async def invite_match_manager(req: MatchManagerInvite):
    """Create a match_manager admin and send the invitation email with credentials."""
    import httpx as _httpx
    from core.config import settings as _settings

    payload = AdminCreate(
        full_name=req.full_name,
        email=req.email,
        permissions={
            "can_manage_users": False,
            "can_manage_financials": False,
            "can_manage_coaches": False,
            "can_manage_matches": True,
        },
        admin_type="match_manager",
        status="Active",
    )
    created = await create_admin(payload)
    temp_password = created.get("temp_password")

    academy_name = "your academy"
    try:
        academy_id = academy_id_ctx.get(None)
        if academy_id:
            async with _httpx.AsyncClient(timeout=10.0) as client:
                ar = await client.get(
                    f"{_settings.SUPABASE_URL}/rest/v1/academies?id=eq.{academy_id}&select=name",
                    headers=supabase.admin_headers,
                )
                if ar.status_code == 200 and ar.json():
                    academy_name = ar.json()[0].get("name") or academy_name
    except Exception as e:
        logger.warning(f"Could not resolve academy name for invite email: {e}")

    sent = False
    if temp_password:
        try:
            sent = send_match_manager_invite(
                to=req.email,
                name=req.full_name,
                temp_password=temp_password,
                academy_name=academy_name,
            )
        except Exception as e:
            logger.error(f"Match manager invite email failed: {e}", exc_info=True)

    return {
        **created,
        "email_sent": sent,
    }


@router.post("/{admin_id}/reset-password")
async def reset_admin_password(admin_id: str):
    """Generate a new temp password for an admin and update Supabase Auth."""
    import httpx
    from core.config import settings as _settings
    try:
        # Look up the admin row to get user_id + email
        rows = await supabase._get(f"/rest/v1/admins?id=eq.{admin_id}&select=user_id,email,full_name")
        if not rows:
            raise HTTPException(status_code=404, detail="Admin not found")
        admin_row = rows[0]
        user_id = admin_row.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Admin has no linked auth user")

        new_password = generate_temp_password()

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.put(
                f"{_settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                json={"password": new_password},
                headers=supabase.admin_headers,
            )
            if res.status_code != 200:
                logger.error(f"Password reset failed for admin {admin_id}: {res.status_code} {res.text}")
                raise HTTPException(status_code=500, detail="Failed to reset password in Supabase Auth")

        return {
            "email": admin_row.get("email"),
            "full_name": admin_row.get("full_name"),
            "temp_password": new_password,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error resetting admin password: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

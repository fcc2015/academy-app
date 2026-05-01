from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from typing import List
from schemas.admins import AdminCreate, AdminResponse
from services.supabase_client import supabase
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
        
        # 4. Insert into admins table
        response = await supabase.insert_admin(admin_dict)
        
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

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

        # --- Duplicate Check: Email ---
        existing = await supabase._get(f"/rest/v1/admins?email=eq.{quote(email)}&select=id")
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This email is already used by another admin. | هاد الإيميل ديجا مستعمل من طرف أدمين آخر: {email}"
            )
        
        # 1. Generate temp password
        temp_password = generate_temp_password()
        
        # 2. Create Auth User
        auth_response = await supabase.sign_up(
            email=email,
            password=temp_password,
            data={"role": "admin", "full_name": full_name}
        )
        
        user_id = auth_response.get("user", {}).get("id")
        
        if not user_id:
            raise Exception("Failed to create auth user")
            
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
        if "duplicate" in error_msg.lower() or "23505" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This email already exists. | هاد الإيميل ديجا كاين: {email}"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
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

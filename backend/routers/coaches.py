import logging
from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token, require_role
from typing import List
from schemas.coaches import CoachCreate, CoachResponse
from services.supabase_client import supabase

logger = logging.getLogger("coaches")
from urllib.parse import quote
import secrets
import string
import uuid as uuid_lib

router = APIRouter(prefix="/coaches", tags=["Coaches"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[CoachResponse])
async def get_all_coaches():
    try:
        response = await supabase.get_coaches()
        return response
    except Exception as e:
        logger.error("Error fetching coaches: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

def generate_temp_password(length=10):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for i in range(length))

@router.post("/", response_model=CoachResponse, dependencies=[Depends(require_role("admin", "super_admin"))])
async def create_coach(coach: CoachCreate):
    try:
        coach_dict = coach.model_dump()
        email = coach_dict.get("email", "")
        
        # --- Duplicate Check: Email ---
        if email:
            existing = await supabase._get(f"/rest/v1/coaches?email=eq.{quote(email)}&select=id")
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"This email is already used by another coach. | هاد الإيميل ديجا مستعمل من طرف مدرب آخر: {email}"
                )
        
        temp_password = generate_temp_password()

        # user_id is a foreign key to users table. Since we bypass Supabase Auth
        # and it's nullable, we just don't set it to avoid FK constraint errors.
        if "user_id" in coach_dict:
            del coach_dict["user_id"]

        # Insert directly into coaches table
        response = await supabase.insert_coach(coach_dict)

        created_coach = response[0]
        # Show the temp password to the admin once
        created_coach["temp_password"] = temp_password

        return created_coach
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error("Error creating coach: %s", e, exc_info=True)
        if "duplicate" in error_msg.lower() or "23505" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This email already exists. | هاد الإيميل ديجا كاين: {email}"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.put("/{coach_id}", dependencies=[Depends(require_role("admin", "super_admin"))])
async def update_coach(coach_id: str, coach: CoachCreate):
    try:
        coach_dict = coach.model_dump(exclude_none=True)
        response = await supabase.update_coach(coach_id, coach_dict)
        return response[0] if isinstance(response, list) else response
    except Exception as e:
        logger.error("Error updating coach: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.delete("/{coach_id}", dependencies=[Depends(require_role("admin", "super_admin"))])
async def delete_coach(coach_id: str):
    try:
        await supabase.delete_coach(coach_id)
        return {"message": "Coach deleted successfully"}
    except Exception as e:
        logger.error("Error deleting coach: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

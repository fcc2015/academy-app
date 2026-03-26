from fastapi import APIRouter, HTTPException, status
from typing import List
from schemas.coaches import CoachCreate, CoachResponse
from services.supabase_client import supabase
import secrets
import string
import uuid as uuid_lib

router = APIRouter(prefix="/coaches", tags=["Coaches"])

@router.get("/", response_model=List[CoachResponse])
async def get_all_coaches():
    try:
        response = await supabase.get_coaches()
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching coaches: {str(e)}"
        )

def generate_temp_password(length=10):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for i in range(length))

@router.post("/", response_model=CoachResponse)
async def create_coach(coach: CoachCreate):
    try:
        coach_dict = coach.model_dump()
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
    except Exception as e:
        error_msg = str(e)
        print(f"DEBUG ERROR creating coach: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating coach: {error_msg}"
        )

@router.put("/{coach_id}")
async def update_coach(coach_id: str, coach: CoachCreate):
    try:
        coach_dict = coach.model_dump(exclude_none=True)
        response = await supabase.update_coach(coach_id, coach_dict)
        return response[0] if isinstance(response, list) else response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating coach: {str(e)}"
        )

@router.delete("/{coach_id}")
async def delete_coach(coach_id: str):
    try:
        await supabase.delete_coach(coach_id)
        return {"message": "Coach deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting coach: {str(e)}"
        )

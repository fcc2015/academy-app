from fastapi import APIRouter, Depends, HTTPException, status, Query
from core.auth_middleware import verify_token, require_role, assert_parent_owns_player
from core.context import user_id_ctx, role_ctx
from typing import List
from schemas.attendance import AttendanceResponse, AttendanceBulkCreate
from services.supabase_client import supabase

import logging
logger = logging.getLogger("attendance")

router = APIRouter(prefix="/attendance", tags=["Attendance"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[AttendanceResponse])
async def get_attendance(squad_id: str = Query(...), date: str = Query(...),
                         user: dict = Depends(require_role("admin", "coach", "super_admin"))):
    try:
        return await supabase.get_attendance(squad_id, date)
    except Exception as e:
        logger.error("Error fetching attendance: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.get("/player/{player_id}")
async def get_player_attendance(player_id: str):
    current_role = role_ctx.get()
    current_user = user_id_ctx.get()
    if current_role == "parent":
        await assert_parent_owns_player(current_user, player_id)
    try:
        return await supabase.get_player_attendance(player_id)
    except Exception as e:
        logger.error("Error fetching player attendance: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.post("/bulk")
async def bulk_upsert_attendance(payload: AttendanceBulkCreate):
    try:
        records = []
        for item in payload.records:
            records.append({
                "squad_id": payload.squad_id,
                "player_id": item.player_id,
                "date": payload.date.isoformat(),
                "status": item.status,
                "notes": item.notes
            })
            
        return await supabase.upsert_attendance(records)
    except Exception as e:
        logger.error("Error saving attendance: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

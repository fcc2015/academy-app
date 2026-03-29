from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from typing import List
from schemas.attendance import AttendanceResponse, AttendanceBulkCreate
from services.supabase_client import supabase

router = APIRouter(prefix="/attendance", tags=["Attendance"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[AttendanceResponse])
async def get_attendance(squad_id: str, date: str):
    try:
        return await supabase.get_attendance(squad_id, date)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching attendance: {str(e)}"
        )

@router.get("/player/{player_id}")
async def get_player_attendance(player_id: str):
    try:
        return await supabase.get_player_attendance(player_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching player attendance: {str(e)}"
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving attendance: {str(e)}"
        )

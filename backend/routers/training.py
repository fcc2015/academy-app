from fastapi import APIRouter, Depends, HTTPException
from core.auth_middleware import verify_token
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date
from services.supabase_client import supabase

router = APIRouter(prefix="/training", tags=["Training"], dependencies=[Depends(verify_token)])

class TrainingSessionBase(BaseModel):
    title: str
    coach_id: Optional[str] = None
    squad_id: Optional[str] = None
    session_date: datetime
    duration_minutes: Optional[int] = 90
    location: Optional[str] = "Main Pitch"
    session_type: Optional[str] = "Technical"
    objectives: Optional[str] = None
    status: Optional[str] = "Scheduled"
    notes: Optional[str] = None

class TrainingSessionCreate(TrainingSessionBase): pass
class TrainingSessionUpdate(BaseModel):
    title: Optional[str] = None
    coach_id: Optional[str] = None
    squad_id: Optional[str] = None
    session_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    session_type: Optional[str] = None
    objectives: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

@router.get("/")
async def get_training_sessions():
    try: return await supabase.get_training_sessions()
    except Exception as e: raise HTTPException(500, detail=str(e))

@router.get("/coach/{coach_id}")
async def get_sessions_by_coach(coach_id: str):
    try: return await supabase.get_training_sessions_by_coach(coach_id)
    except Exception as e: raise HTTPException(500, detail=str(e))

@router.post("/")
async def create_training_session(session: TrainingSessionCreate):
    try:
        data = session.model_dump(mode='json')
        return await supabase.insert_training_session(data)
    except Exception as e: raise HTTPException(500, detail=str(e))

@router.patch("/{session_id}")
async def update_training_session(session_id: str, session: TrainingSessionUpdate):
    try:
        data = session.model_dump(exclude_unset=True, mode='json')
        return await supabase.update_training_session(session_id, data)
    except Exception as e: raise HTTPException(500, detail=str(e))

@router.delete("/{session_id}")
async def delete_training_session(session_id: str):
    try: return await supabase.delete_training_session(session_id)
    except Exception as e: raise HTTPException(500, detail=str(e))

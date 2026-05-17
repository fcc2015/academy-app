from fastapi import APIRouter, Depends, HTTPException
from core.auth_middleware import verify_token
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date
from services.supabase_client import supabase

import logging
logger = logging.getLogger("training")

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
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

@router.get("/coach/{coach_id}")
async def get_sessions_by_coach(coach_id: str):
    try: return await supabase.get_training_sessions_by_coach(coach_id)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

@router.post("/")
async def create_training_session(session: TrainingSessionCreate):
    try:
        data = session.model_dump(mode='json')
        result = await supabase.insert_training_session(data)

        # Notify coach about new session
        try:
            coach_id = data.get("coach_id")
            title = data.get("title") or "تدريب"
            session_date = (data.get("session_date") or "")[:10]
            location = data.get("location") or ""

            if coach_id:
                # Fetch coach user_id from coaches table
                import httpx as _httpx
                from core.config import settings as _settings
                async with _httpx.AsyncClient(trust_env=False, timeout=5.0) as client:
                    c_res = await client.get(
                        f"{_settings.SUPABASE_URL}/rest/v1/coaches?id=eq.{coach_id}&select=user_id,name",
                        headers=supabase.admin_headers,
                    )
                    if c_res.status_code == 200 and c_res.json():
                        coach = c_res.json()[0]
                        coach_user_id = coach.get("user_id")
                        notif = {
                            "title": f"⚽ تدريب جديد: {title}",
                            "message": f"تم جدولة تدريب بتاريخ {session_date}" + (f" في {location}" if location else "") + ".",
                            "type": "system",
                        }
                        if coach_user_id:
                            notif["user_id"] = coach_user_id
                        else:
                            notif["target_role"] = "coach"
                        await supabase.insert_notification(notif)
            else:
                # No specific coach — notify all coaches
                await supabase.insert_notification({
                    "title": f"⚽ تدريب جديد: {title}",
                    "message": f"تم جدولة تدريب بتاريخ {session_date}" + (f" في {location}" if location else "") + ".",
                    "type": "system",
                    "target_role": "coach",
                })
        except Exception as notif_err:
            logger.warning("Failed to send training notification: %s", notif_err)

        return result
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

@router.patch("/{session_id}")
async def update_training_session(session_id: str, session: TrainingSessionUpdate):
    try:
        data = session.model_dump(exclude_unset=True, mode='json')
        result = await supabase.update_training_session(session_id, data)

        # If session status changed to Completed, notify admin
        new_status = data.get("status", "")
        if new_status.lower() in ("completed", "منتهي", "منجز"):
            try:
                await supabase.insert_notification({
                    "title": "✅ اكتمال التدريب",
                    "message": f"تم الانتهاء من حصة التدريب بنجاح.",
                    "type": "success",
                    "target_role": "admin",
                })
            except Exception as notif_err:
                logger.warning("Failed to send training completion notification: %s", notif_err)

        return result
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

@router.delete("/{session_id}")
async def delete_training_session(session_id: str):
    try: return await supabase.delete_training_session(session_id)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

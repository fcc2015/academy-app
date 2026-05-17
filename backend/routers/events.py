from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from typing import List
from schemas.events import EventCreate, EventResponse, EventUpdate
from services.supabase_client import supabase

import logging
logger = logging.getLogger("events")

router = APIRouter(prefix="/events", tags=["Events"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[EventResponse])
async def get_all_events():
    try:
        response = await supabase.get_events()
        return response
    except Exception as e:
        logger.error("Error fetching events: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.post("/", response_model=EventResponse)
async def create_event(event: EventCreate):
    try:
        event_dict = event.model_dump()
        event_dict['event_date'] = event_dict['event_date'].isoformat()
        event_dict['event_time'] = event_dict['event_time'].strftime("%H:%M:%S")
        
        response = await supabase.insert_event(event_dict)
        created = response[0]

        # Notify all roles about new event
        try:
            title = event_dict.get("title") or "حدث جديد"
            date_str = event_dict.get("event_date", "")[:10]
            await supabase.insert_notification({
                "title": f"📅 {title}",
                "message": f"تم جدولة حدث جديد بتاريخ {date_str}. تفقد لوحة التحكم لمزيد من التفاصيل.",
                "type": "system",
                "target_role": "parent",
            })
            await supabase.insert_notification({
                "title": f"📅 {title}",
                "message": f"تم جدولة حدث جديد بتاريخ {date_str}.",
                "type": "system",
                "target_role": "coach",
            })
        except Exception as notif_err:
            logger.warning("Failed to send event notification: %s", notif_err)

        return created
    except Exception as e:
        logger.error("Error creating event: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(event_id: str, event: EventUpdate):
    try:
        event_dict = event.model_dump(exclude_unset=True)
        if 'event_date' in event_dict:
            event_dict['event_date'] = event_dict['event_date'].isoformat()
        if 'event_time' in event_dict:
            event_dict['event_time'] = event_dict['event_time'].strftime("%H:%M:%S")
            
        response = await supabase.update_event(event_id, event_dict)
        return response[0]
    except Exception as e:
        logger.error("Error updating event: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.delete("/{event_id}")
async def delete_event(event_id: str):
    try:
        await supabase.delete_event(event_id)
        return {"message": "Event deleted successfully"}
    except Exception as e:
        logger.error("Error deleting event: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

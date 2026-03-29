from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from typing import List
from schemas.events import EventCreate, EventResponse, EventUpdate
from services.supabase_client import supabase

router = APIRouter(prefix="/events", tags=["Events"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[EventResponse])
async def get_all_events():
    try:
        response = await supabase.get_events()
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching events: {str(e)}"
        )

@router.post("/", response_model=EventResponse)
async def create_event(event: EventCreate):
    try:
        event_dict = event.model_dump()
        # Ensure date and time are strings for JSON
        event_dict['event_date'] = event_dict['event_date'].isoformat()
        event_dict['event_time'] = event_dict['event_time'].strftime("%H:%M:%S")
        
        response = await supabase.insert_event(event_dict)
        return response[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating event: {str(e)}"
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating event: {str(e)}"
        )

@router.delete("/{event_id}")
async def delete_event(event_id: str):
    try:
        await supabase.delete_event(event_id)
        return {"message": "Event deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting event: {str(e)}"
        )

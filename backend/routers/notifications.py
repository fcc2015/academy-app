from fastapi import APIRouter, Depends, HTTPException, status, Query
from core.auth_middleware import verify_token
from typing import List, Optional
from pydantic import BaseModel
from services.supabase_client import supabase

router = APIRouter(prefix="/notifications", tags=["Notifications"], dependencies=[Depends(verify_token)])

class NotificationCreate(BaseModel):
    user_id: Optional[str] = None
    target_role: Optional[str] = None
    title: str
    message: str
    type: str = "system"

class NotificationResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    target_role: Optional[str] = None
    title: str
    message: str
    type: str
    is_read: bool
    created_at: str

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(user_id: Optional[str] = None, role: Optional[str] = None):
    try:
        # In a real app, user_id should come from the verified token
        # For simplicity or admin testing, we allow passing it as a query param
        response = await supabase.get_notifications(user_id=user_id, role=role)
        return response
    except Exception as e:
        print(f"DEBUG ERROR fetching notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching notifications: {str(e)}"
        )

@router.post("/", response_model=NotificationResponse)
async def create_notification(notification: NotificationCreate):
    try:
        data = notification.model_dump()
        if data.get("target_role") == "":
            data["target_role"] = None
        response = await supabase.insert_notification(data)
        return response[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating notification: {str(e)}"
        )

@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str):
    try:
        await supabase.mark_notification_read(notification_id)
        return {"success": True, "message": "Notification marked as read."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating notification: {str(e)}"
        )

@router.delete("/{notification_id}")
async def delete_notification(notification_id: str):
    try:
        await supabase.delete_notification(notification_id)
        return {"success": True, "message": "Notification deleted."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting notification: {str(e)}"
        )

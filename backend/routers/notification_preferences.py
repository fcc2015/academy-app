import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from core.auth_middleware import verify_token
from core.config import settings
from services.supabase_client import supabase

logger = logging.getLogger("notification_preferences")

router = APIRouter(
    prefix="/notification-preferences",
    tags=["Notification Preferences"],
    dependencies=[Depends(verify_token)]
)

class NotificationPreferencesSchema(BaseModel):
    email_enabled: bool = True
    whatsapp_enabled: bool = True
    push_enabled: bool = True
    attendance_alerts: bool = True
    payment_reminders: bool = True
    evaluation_ready: bool = True
    new_event_alerts: bool = True

DEFAULT_PREFERENCES = {
    "email_enabled": True,
    "whatsapp_enabled": True,
    "push_enabled": True,
    "attendance_alerts": True,
    "payment_reminders": True,
    "evaluation_ready": True,
    "new_event_alerts": True
}

@router.get("/", response_model=NotificationPreferencesSchema)
async def get_preferences(user: dict = Depends(verify_token)):
    user_id = user["user_id"]
    try:
        url = f"/rest/v1/notification_preferences?user_id=eq.{user_id}&select=*"
        res = await supabase._get(url)
        if res:
            return res[0]
        # Return defaults if no custom record exists yet
        return DEFAULT_PREFERENCES
    except httpx.HTTPStatusError as http_err:
        logger.warning(
            "HTTP %d fetching notification_preferences for user %s — returning defaults. Detail: %s",
            http_err.response.status_code, user_id, http_err.response.text[:200]
        )
        return DEFAULT_PREFERENCES
    except Exception as e:
        logger.error(f"Error fetching preferences for user {user_id}: {e}", exc_info=True)
        return DEFAULT_PREFERENCES

@router.put("/", response_model=NotificationPreferencesSchema)
async def update_preferences(prefs: NotificationPreferencesSchema, user: dict = Depends(verify_token)):
    user_id = user["user_id"]
    academy_id = user.get("academy_id")
    
    # Payload to insert/update
    payload = prefs.model_dump()
    payload["user_id"] = user_id
    if academy_id:
        payload["academy_id"] = academy_id

    try:
        # Check if record exists
        url_check = f"/rest/v1/notification_preferences?user_id=eq.{user_id}&select=id"
        existing = await supabase._get(url_check)
        
        if existing:
            rec_id = existing[0]["id"]
            res = await supabase.client.patch(f"/rest/v1/notification_preferences?id=eq.{rec_id}", json=payload)
            res.raise_for_status()
            updated = res.json()
            return updated[0] if isinstance(updated, list) else updated
        else:
            res = await supabase._post("/rest/v1/notification_preferences", payload)
            return res[0] if isinstance(res, list) else res
    except httpx.HTTPStatusError as http_err:
        if http_err.response.status_code == 404:
            logger.error("notification_preferences table does not exist. Please run migration SQL.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification preferences database table is not set up. Please contact the administrator to run the migration script."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {http_err.response.text}"
        )
    except Exception as e:
        logger.error(f"Error saving preferences for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save notification preferences."
        )

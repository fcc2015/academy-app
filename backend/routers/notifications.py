import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from core.auth_middleware import verify_token
from typing import List, Optional
from pydantic import BaseModel
from services.supabase_client import supabase
from services.push_service import trigger_push_for_notification

from core.config import settings

logger = logging.getLogger("notifications")

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

class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys
    user_agent: Optional[str] = None

class UnsubscribeRequest(BaseModel):
    endpoint: str


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(user_id: Optional[str] = None, role: Optional[str] = None):
    try:
        # In a real app, user_id should come from the verified token
        # For simplicity or admin testing, we allow passing it as a query param
        response = await supabase.get_notifications(user_id=user_id, role=role)
        return response
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.post("/", response_model=NotificationResponse)
async def create_notification(notification: NotificationCreate, user: dict = Depends(verify_token)):
    try:
        data = notification.model_dump()
        if data.get("target_role") == "":
            data["target_role"] = None
        # Inject academy_id from the authenticated user so push service can find subscribers
        academy_id = user.get("academy_id")
        response = await supabase.insert_notification(data)
        created = response[0]
        # Fire push notifications in background (non-blocking)
        push_payload = {**data, "academy_id": academy_id, "id": created.get("id")}
        asyncio.create_task(trigger_push_for_notification(supabase, push_payload))
        return created
    except Exception as e:
        logger.error("Error creating notification: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str):
    try:
        await supabase.mark_notification_read(notification_id)
        return {"success": True, "message": "Notification marked as read."}
    except Exception as e:
        logger.error("Error updating notification: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.delete("/{notification_id}")
async def delete_notification(notification_id: str):
    try:
        await supabase.delete_notification(notification_id)
        return {"success": True, "message": "Notification deleted."}
    except Exception as e:
        logger.error("Error deleting notification: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.get("/vapid-key")
async def get_vapid_key(user: dict = Depends(verify_token)):
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VAPID public key not configured on server"
        )
    return {"publicKey": settings.VAPID_PUBLIC_KEY}

@router.post("/subscribe")
async def subscribe_push(sub: PushSubscriptionCreate, user: dict = Depends(verify_token)):
    try:
        await supabase.save_push_subscription(
            user_id=user["user_id"],
            academy_id=user["academy_id"],
            endpoint=sub.endpoint,
            p256dh=sub.keys.p256dh,
            auth=sub.keys.auth,
            user_agent=sub.user_agent
        )
        return {"success": True, "message": "Subscribed to push notifications successfully."}
    except Exception as e:
        logger.error("Error subscribing to push notifications: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save subscription."
        )

@router.post("/unsubscribe")
async def unsubscribe_push(req: UnsubscribeRequest, user: dict = Depends(verify_token)):
    try:
        await supabase.delete_push_subscription(req.endpoint)
        return {"success": True, "message": "Unsubscribed from push notifications successfully."}
    except Exception as e:
        logger.error("Error unsubscribing from push notifications: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not remove subscription."
        )


class WhatsAppBlastRequest(BaseModel):
    message: str
    target_role: Optional[str] = "parent"
    player_ids: Optional[List[str]] = None


@router.post("/whatsapp-blast")
async def send_whatsapp_blast(req: WhatsAppBlastRequest, user: dict = Depends(verify_token)):
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can send WhatsApp blasts")

    from services.queue_service import enqueue_task
    import httpx
    
    academy_id = user.get("academy_id")
    query = f"{settings.SUPABASE_URL}/rest/v1/players?select=id,parent_whatsapp,full_name&parent_whatsapp=not.is.null"
    if academy_id:
        query += f"&academy_id=eq.{academy_id}"
        
    if req.player_ids:
        ids_str = ",".join(req.player_ids)
        query += f"&id=in.({ids_str})"
        
    async with httpx.AsyncClient(trust_env=False, timeout=15.0) as client:
        res = await client.get(query, headers=supabase.admin_headers)
        if res.status_code != 200:
            logger.error(f"Failed to fetch players: {res.text}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch players contact list")
        players = res.json()
        
    phone_to_name = {}
    for p in players:
        phone = p.get("parent_whatsapp")
        if phone:
            clean_phone = "".join(filter(str.isdigit, phone))
            if clean_phone:
                phone_to_name[clean_phone] = p.get("full_name")
                
    if not phone_to_name:
        return {"success": True, "queued_count": 0, "message": "No valid parent phone numbers found."}
        
    for phone, name in phone_to_name.items():
        msg_text = req.message.replace("{player_name}", name)
        await enqueue_task("send_whatsapp_message", phone, msg_text)
            
    return {
        "success": True,
        "queued": True,
        "total_targets": len(phone_to_name)
    }



"""
Web Push Notification service using VAPID + pywebpush.
Handles storing subscriptions and sending push messages.
"""
import json
import logging
from typing import Optional
from pywebpush import webpush, WebPushException
from core.config import settings

logger = logging.getLogger("push_service")


def send_push(subscription_info: dict, title: str, body: str, url: str = "/", icon: str = "/icons/icon-192x192.png") -> bool:
    """
    Send a Web Push notification to a single subscription.

    Args:
        subscription_info: dict with keys: endpoint, keys.p256dh, keys.auth
        title: notification title
        body: notification body text
        url: URL to open on click
        icon: icon URL

    Returns:
        True on success, False on failure
    """
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured — push notification skipped")
        return False

    payload = json.dumps({
        "title": title,
        "body": body,
        "icon": icon,
        "badge": "/icons/icon-96x96.png",
        "data": {"url": url},
        "actions": [
            {"action": "open", "title": "فتح"},
            {"action": "close", "title": "إغلاق"}
        ]
    })

    try:
        webpush(
            subscription_info={
                "endpoint": subscription_info["endpoint"],
                "keys": {
                    "p256dh": subscription_info["p256dh"],
                    "auth": subscription_info["auth"],
                }
            },
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": settings.VAPID_CLAIMS_EMAIL,
            },
        )
        return True
    except WebPushException as e:
        # 410 Gone = subscription expired/unregistered, should be removed from DB
        if "410" in str(e) or "404" in str(e):
            logger.info("Subscription expired (410/404) — should be removed: %s", subscription_info.get("endpoint", "")[:50])
            raise  # Let caller handle removal
        logger.error("WebPush error: %s", e, exc_info=True)
        return False
    except Exception as e:
        logger.error("Push send error: %s", e, exc_info=True)
        return False


async def send_push_to_academy(supabase_client, academy_id: str, title: str, body: str, url: str = "/"):
    """
    Broadcast a push notification to ALL subscribed users of an academy.
    Removes expired subscriptions (410/404) automatically.
    """
    if not settings.VAPID_PRIVATE_KEY:
        return {"sent": 0, "failed": 0, "skipped": True}

    try:
        subs = await supabase_client._get(
            f"/rest/v1/push_subscriptions?academy_id=eq.{academy_id}&select=*"
        )
    except Exception as e:
        logger.error("Failed to fetch push subscriptions: %s", e)
        return {"sent": 0, "failed": 0}

    sent = 0
    failed = 0
    to_delete = []

    for sub in (subs or []):
        try:
            ok = send_push(sub, title, body, url)
            if ok:
                sent += 1
            else:
                failed += 1
        except WebPushException:
            # Expired subscription — mark for deletion
            to_delete.append(sub["id"])
            failed += 1

    # Clean up expired subscriptions
    for sub_id in to_delete:
        try:
            await supabase_client.client.delete(f"/rest/v1/push_subscriptions?id=eq.{sub_id}")
        except Exception:
            pass

    return {"sent": sent, "failed": failed, "cleaned": len(to_delete)}


async def trigger_push_for_notification(supabase_client, notif: dict):
    """
    Look up matching push subscriptions for a newly created notification
    and dispatch web push messages in the background.
    """
    from pywebpush import WebPushException
    from core.config import settings

    if not settings.VAPID_PRIVATE_KEY:
        logger.debug("VAPID keys not configured — push notification skipped")
        return

    academy_id = notif.get("academy_id")
    if not academy_id:
        from core.context import academy_id_ctx
        academy_id = academy_id_ctx.get(None)

    if not academy_id:
        logger.debug("No academy_id found for notification push trigger")
        return

    user_id = notif.get("user_id")
    target_role = notif.get("target_role")

    try:
        if user_id:
            query = f"/rest/v1/push_subscriptions?academy_id=eq.{academy_id}&user_id=eq.{user_id}&select=*"
            subs = await supabase_client._get(query)
        elif target_role:
            # Fetch subscriptions with embedded user role to filter in Python
            query = f"/rest/v1/push_subscriptions?academy_id=eq.{academy_id}&select=*,users(role)"
            all_subs = await supabase_client._get(query)
            target_role_lower = target_role.lower()
            subs = []
            for s in (all_subs or []):
                user_data = s.get("users")
                if isinstance(user_data, list) and user_data:
                    user_data = user_data[0]
                user_role = (user_data or {}).get("role", "")
                if user_role.lower() == target_role_lower:
                    subs.append(s)
        else:
            query = f"/rest/v1/push_subscriptions?academy_id=eq.{academy_id}&select=*"
            subs = await supabase_client._get(query)
    except Exception as e:
        logger.error("Failed to fetch matching push subscriptions: %s", e)
        return

    if not subs:
        return

    title = notif.get("title", "تنبيه جديد")
    body = notif.get("message", "")
    
    # Determine redirect URL
    url = "/"
    notif_type = notif.get("type", "system")
    if "payment" in notif_type.lower() or "pay" in title.lower() or "أداء" in title:
        url = "/parent/payments" if user_id or (target_role and target_role.lower() == "parent") else "/admin/finances"
    elif "event" in notif_type.lower() or "match" in notif_type.lower():
        url = "/coach/dashboard" if (target_role and target_role.lower() == "coach") else ("/parent/child" if user_id else "/admin/players")

    to_delete = []
    for sub in subs:
        try:
            send_push(sub, title, body, url)
        except WebPushException as e:
            if "410" in str(e) or "404" in str(e):
                to_delete.append(sub["id"])
        except Exception as e:
            logger.error("Error sending push: %s", e)

    # Clean up expired subscriptions
    for sub_id in to_delete:
        try:
            await supabase_client.client.delete(f"/rest/v1/push_subscriptions?id=eq.{sub_id}")
        except Exception:
            pass


import asyncio
import logging
from typing import Any
from core.config import settings

logger = logging.getLogger("queue_service")

def get_service_function(func_name: str):
    """Dynamically resolve function name to actual service function."""
    if func_name == "send_welcome_email":
        from services.email_service import send_welcome_email
        return send_welcome_email
    elif func_name == "send_match_manager_invite":
        from services.email_service import send_match_manager_invite
        return send_match_manager_invite
    elif func_name == "send_payment_reminder":
        from services.email_service import send_payment_reminder
        return send_payment_reminder
    elif func_name == "send_otp_email":
        from services.email_service import send_otp_email
        return send_otp_email
    elif func_name == "send_event_notification":
        from services.email_service import send_event_notification
        return send_event_notification
    elif func_name == "send_payment_receipt":
        from services.email_service import send_payment_receipt
        return send_payment_receipt
    elif func_name == "send_renewal_reminder":
        from services.email_service import send_renewal_reminder
        return send_renewal_reminder
    elif func_name == "send_overdue_notification":
        from services.email_service import send_overdue_notification
        return send_overdue_notification
    elif func_name == "send_monthly_academy_report":
        from services.email_service import send_monthly_academy_report
        return send_monthly_academy_report
    elif func_name == "send_suspension_notice":
        from services.email_service import send_suspension_notice
        return send_suspension_notice
    elif func_name == "send_whatsapp_message":
        from services.whatsapp_service import send_whatsapp_message
        return send_whatsapp_message
    return None

async def run_task_locally(func_name: str, *args, **kwargs):
    """Resolve and run function immediately in the current thread/event loop."""
    func = get_service_function(func_name)
    if func:
        try:
            if asyncio.iscoroutinefunction(func):
                await func(*args, **kwargs)
            else:
                # Run sync functions in executor to avoid blocking the event loop
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(None, lambda: func(*args, **kwargs))
            logger.info("Local background task %s completed successfully.", func_name)
        except Exception as e:
            logger.error("Local background task %s failed: %s", func_name, e, exc_info=True)
    else:
        logger.error("Local background task function %s not found.", func_name)

async def enqueue_task(func_name: str, *args, **kwargs) -> bool:
    """Enqueue a task to the Redis-backed queue or execute locally in background as fallback."""
    if settings.REDIS_URL:
        try:
            from arq import create_pool
            from arq.connections import RedisSettings
            # arq accepts RedisSettings or connection string
            # if we have a full Redis URL, we can build settings
            try:
                # Check if it is a complete URL and parse it, otherwise default
                pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
            except Exception:
                pool = await create_pool(settings.REDIS_URL)

            await pool.enqueue_job(func_name, *args, **kwargs)
            await pool.close()
            logger.info("Job %s successfully enqueued to Redis.", func_name)
            return True
        except Exception as e:
            logger.error("Failed to enqueue job %s to Redis: %s. Falling back to local background execution.", func_name, e)
    
    # Local fallback using asyncio
    asyncio.create_task(run_task_locally(func_name, *args, **kwargs))
    logger.info("Job %s spawned locally in background task.", func_name)
    return False

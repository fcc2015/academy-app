import asyncio
import logging
from core.config import settings
from services.queue_service import get_service_function

logger = logging.getLogger("worker")

# Define the async wrapper tasks that arq will execute
async def send_welcome_email(ctx, to: str, name: str):
    func = get_service_function("send_welcome_email")
    await loop_run(func, to, name)

async def send_match_manager_invite(ctx, to: str, name: str, temp_password: str, academy_name: str = "your academy"):
    func = get_service_function("send_match_manager_invite")
    await loop_run(func, to, name, temp_password, academy_name)

async def send_payment_reminder(ctx, to: str, player_name: str, amount: float, due_date: str):
    func = get_service_function("send_payment_reminder")
    await loop_run(func, to, player_name, amount, due_date)

async def send_otp_email(ctx, to: str, code: str, purpose: str = "verify"):
    func = get_service_function("send_otp_email")
    await loop_run(func, to, code, purpose)

async def send_event_notification(ctx, to: str, event_title: str, event_date: str, event_time: str = ""):
    func = get_service_function("send_event_notification")
    await loop_run(func, to, event_title, event_date, event_time)

async def send_payment_receipt(ctx, to: str, payer_name: str, amount: float, currency: str, plan_name: str, order_id: str, paid_at: str):
    func = get_service_function("send_payment_receipt")
    await loop_run(func, to, payer_name, amount, currency, plan_name, order_id, paid_at)

async def send_renewal_reminder(ctx, to: str, academy_name: str, plan_name: str, renewal_date: str, days_until: int, amount: float, currency: str = "MAD"):
    func = get_service_function("send_renewal_reminder")
    await loop_run(func, to, academy_name, plan_name, renewal_date, days_until, amount, currency)

async def send_overdue_notification(ctx, to: str, player_name: str, amount: float, days_overdue: int, due_date: str):
    func = get_service_function("send_overdue_notification")
    await loop_run(func, to, player_name, amount, days_overdue, due_date)

async def send_monthly_academy_report(ctx, to: str, academy_name: str, player_count: int, revenue: float, attendance_pct: float, month_name: str):
    func = get_service_function("send_monthly_academy_report")
    await loop_run(func, to, academy_name, player_count, revenue, attendance_pct, month_name)

async def send_suspension_notice(ctx, to: str, academy_name: str, reason: str = "non-payment"):
    func = get_service_function("send_suspension_notice")
    await loop_run(func, to, academy_name, reason)

async def send_whatsapp_message(ctx, phone: str, text: str):
    func = get_service_function("send_whatsapp_message")
    await loop_run(func, phone, text)

async def loop_run(func, *args, **kwargs):
    """Helper to run synchronous or asynchronous functions correctly in the worker event loop."""
    if not func:
        return
    try:
        if asyncio.iscoroutinefunction(func):
            await func(*args, **kwargs)
        else:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, lambda: func(*args, **kwargs))
    except Exception as e:
        logger.error(f"Worker task error running {func.__name__ if hasattr(func, '__name__') else 'unknown'}: {e}", exc_info=True)

async def startup(ctx):
    logger.info("ARQ Worker starting up...")

async def shutdown(ctx):
    logger.info("ARQ Worker shutting down...")

class WorkerSettings:
    functions = [
        send_welcome_email,
        send_match_manager_invite,
        send_payment_reminder,
        send_otp_email,
        send_event_notification,
        send_payment_receipt,
        send_renewal_reminder,
        send_overdue_notification,
        send_monthly_academy_report,
        send_suspension_notice,
        send_whatsapp_message
    ]
    # arq connection parsing
    if settings.REDIS_URL:
        try:
            from arq.connections import RedisSettings
            redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
        except Exception:
            redis_settings = settings.REDIS_URL
    else:
        redis_settings = None
        
    on_startup = startup
    on_shutdown = shutdown

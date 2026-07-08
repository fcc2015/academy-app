"""
WhatsApp Router — /whatsapp
===========================
Dedicated endpoints for WhatsApp integration management.

Endpoints:
  GET  /whatsapp/status          — Returns provider config and connection health
  POST /whatsapp/test            — Send a test WhatsApp message to a specific number
  POST /whatsapp/send            — Send an arbitrary message to a specific number (admin only)
  GET  /whatsapp/link            — Generate a wa.me click-to-chat link (no auth needed)
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Optional

from core.auth_middleware import verify_token, require_role
from core.config import settings
from services.whatsapp_service import (
    send_whatsapp_message,
    generate_whatsapp_link,
    format_moroccan_phone,
    _detect_provider,
)

logger = logging.getLogger("whatsapp.router")

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class WhatsAppTestRequest(BaseModel):
    phone: str
    message: Optional[str] = None   # defaults to a system test message


class WhatsAppSendRequest(BaseModel):
    phone: str
    message: str


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.get("/status")
async def get_whatsapp_status(user: dict = Depends(require_role("admin", "super_admin"))):
    """
    Returns the current WhatsApp provider configuration and connection readiness.
    Does NOT expose secret tokens — only indicates which fields are set.
    """
    provider = _detect_provider()

    status_info = {
        "provider": provider,
        "configured": provider != "mock",
        "click_to_chat_available": True,   # always free
    }

    if provider == "twilio":
        status_info["twilio"] = {
            "account_sid_set": bool(getattr(settings, "TWILIO_ACCOUNT_SID", None)),
            "auth_token_set": bool(getattr(settings, "TWILIO_AUTH_TOKEN", None)),
            "from_number": getattr(settings, "TWILIO_WHATSAPP_FROM", None) or "NOT SET",
        }
    elif provider == "meta":
        status_info["meta"] = {
            "token_set": bool(getattr(settings, "META_WHATSAPP_TOKEN", None)),
            "phone_number_id": getattr(settings, "META_PHONE_NUMBER_ID", None) or "NOT SET",
            "api_version": getattr(settings, "META_API_VERSION", "v19.0"),
        }
    else:
        status_info["note"] = (
            "Running in MOCK mode — messages are only logged, not sent. "
            "Set WHATSAPP_PROVIDER=twilio or WHATSAPP_PROVIDER=meta in your .env to enable real sending."
        )

    return status_info


@router.post("/test")
async def send_test_message(
    req: WhatsAppTestRequest,
    user: dict = Depends(require_role("admin", "super_admin")),
):
    """
    Send a test WhatsApp message to verify the integration is working.
    Accessible to admins only. Returns the provider, formatted number, and success flag.
    """
    provider = _detect_provider()
    formatted = format_moroccan_phone(req.phone)

    if not formatted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid phone number: '{req.phone}'"
        )

    test_message = req.message or (
        f"✅ *WhatsApp Integration Test*\n\n"
        f"This is a test message from your Football Academy platform.\n"
        f"Provider: *{provider.upper()}*\n"
        f"If you received this, your WhatsApp integration is working correctly! 🎉"
    )

    success = await send_whatsapp_message(req.phone, test_message)
    click_link = generate_whatsapp_link(req.phone, test_message)

    return {
        "success": success,
        "provider": provider,
        "to": f"+{formatted}",
        "whatsapp_web_link": click_link,
        "note": (
            "Message sent via API." if success and provider != "mock"
            else "Running in MOCK mode — check server logs for the message content."
        ),
    }


@router.post("/send")
async def send_custom_message(
    req: WhatsAppSendRequest,
    user: dict = Depends(require_role("admin", "super_admin")),
):
    """
    Send a custom WhatsApp message to any phone number.
    Admin-only. Useful for one-off manual outreach.
    """
    if not req.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message body cannot be empty."
        )

    formatted = format_moroccan_phone(req.phone)
    if not formatted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid phone number: '{req.phone}'"
        )

    success = await send_whatsapp_message(req.phone, req.message)
    click_link = generate_whatsapp_link(req.phone, req.message)

    return {
        "success": success,
        "to": f"+{formatted}",
        "whatsapp_web_link": click_link,
    }


@router.get("/link")
async def get_whatsapp_link(
    phone: str = Query(..., description="Phone number (Moroccan or international)"),
    message: str = Query(..., description="Pre-filled message text"),
    _user: dict = Depends(verify_token),
):
    """
    Generate a wa.me click-to-chat link for a given phone + message.
    This is completely free and works without any API credentials.
    """
    formatted = format_moroccan_phone(phone)
    if not formatted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid phone number: '{phone}'"
        )

    link = generate_whatsapp_link(phone, message)
    return {
        "phone": f"+{formatted}",
        "whatsapp_web_link": link,
    }

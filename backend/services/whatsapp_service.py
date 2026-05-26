import logging
import urllib.parse
import httpx
from core.config import settings

logger = logging.getLogger("whatsapp")

def format_moroccan_phone(phone: str) -> str:
    """Format phone number for WhatsApp (e.g. +212600000000 or 212600000000)."""
    if not phone:
        return ""
    clean = "".join(filter(str.isdigit, phone))
    
    # If starts with 06 or 07 (local Moroccan number), prepends 212
    if clean.startswith("06") and len(clean) == 10:
        return "212" + clean[1:]
    elif clean.startswith("07") and len(clean) == 10:
        return "212" + clean[1:]
    elif clean.startswith("6") and len(clean) == 9:
        return "212" + clean
    elif clean.startswith("7") and len(clean) == 9:
        return "212" + clean
    
    return clean

def generate_whatsapp_link(phone: str, text: str) -> str:
    """
    Generate a direct WhatsApp click-to-chat web link with pre-filled message.
    This is free and doesn't require any WhatsApp Business API setup.
    """
    formatted_phone = format_moroccan_phone(phone)
    encoded_text = urllib.parse.quote(text)
    return f"https://wa.me/{formatted_phone}?text={encoded_text}"

async def send_whatsapp_message(phone: str, text: str) -> bool:
    """
    Trigger automated WhatsApp message using Twilio or generic Meta cloud API if configured.
    Falls back to mock/logging if WHATSAPP_API_KEY is not set.
    """
    formatted_phone = format_moroccan_phone(phone)
    if not formatted_phone:
        logger.error("Invalid phone number for WhatsApp message.")
        return False

    api_key = settings.WHATSAPP_API_KEY if hasattr(settings, "WHATSAPP_API_KEY") else None
    api_url = settings.WHATSAPP_API_URL if hasattr(settings, "WHATSAPP_API_URL") else None
    
    if not api_key:
        logger.info(f"[WHATSAPP MOCK] Would send to {formatted_phone}: {text}")
        return True

    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        # Generic Meta / Twilio messaging payload structure
        payload = {
            "to": f"+{formatted_phone}" if not formatted_phone.startswith("+") else formatted_phone,
            "body": text,
            "type": "text"
        }
        
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            res = await client.post(api_url or "https://api.whatsapp.com/v1/messages", json=payload, headers=headers)
            if res.status_code in (200, 201, 202):
                logger.info(f"Automated WhatsApp message successfully sent to {formatted_phone}")
                return True
            else:
                logger.error(f"WhatsApp API error {res.status_code}: {res.text}")
                return False
    except Exception as e:
        logger.error(f"WhatsApp API exception: {e}")
        return False

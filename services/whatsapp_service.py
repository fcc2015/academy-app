"""
WhatsApp Service — Production-Ready
=====================================
Supports three providers, auto-detected from env vars:

  1. TWILIO  — Set WHATSAPP_PROVIDER=twilio
               Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
               Docs: https://www.twilio.com/docs/whatsapp

  2. META    — Set WHATSAPP_PROVIDER=meta
               Requires: META_WHATSAPP_TOKEN, META_PHONE_NUMBER_ID
               Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

  3. MOCK    — Default when no credentials are configured.
               Falls back to generating wa.me click-to-chat links (free, no API).

Usage:
    from services.whatsapp_service import send_whatsapp_message, generate_whatsapp_link
    await send_whatsapp_message("+212612345678", "Hello World")
"""

import logging
import urllib.parse
import base64
import httpx
from core.config import settings

logger = logging.getLogger("whatsapp")


# ─────────────────────────────────────────────
# Phone number normalisation (Moroccan-first)
# ─────────────────────────────────────────────

def format_moroccan_phone(phone: str) -> str:
    """
    Normalise a Moroccan phone number to E.164 format *without* the leading '+'.
    Returns empty string if the input is invalid.

    Examples:
        "0612345678"  → "212612345678"
        "+212612345678" → "212612345678"
        "212612345678"  → "212612345678"
        "612345678"     → "212612345678"
    """
    if not phone:
        return ""
    clean = "".join(filter(str.isdigit, phone))

    if clean.startswith("212") and len(clean) == 12:
        return clean                          # already correct
    if clean.startswith("06") and len(clean) == 10:
        return "212" + clean[1:]
    if clean.startswith("07") and len(clean) == 10:
        return "212" + clean[1:]
    if clean.startswith("6") and len(clean) == 9:
        return "212" + clean
    if clean.startswith("7") and len(clean) == 9:
        return "212" + clean

    # Generic international: strip leading zeros and hope for the best
    return clean.lstrip("0") or clean


def to_e164(phone: str) -> str:
    """Return phone in +E.164 format (e.g. '+212612345678')."""
    normalised = format_moroccan_phone(phone)
    if normalised and not normalised.startswith("+"):
        return f"+{normalised}"
    return normalised


# ─────────────────────────────────────────────
# Click-to-chat link (always free, no API)
# ─────────────────────────────────────────────

def generate_whatsapp_link(phone: str, text: str) -> str:
    """
    Generate a wa.me click-to-chat link with a pre-filled message.
    This works for any phone number without any API credentials.
    """
    normalised = format_moroccan_phone(phone)
    encoded_text = urllib.parse.quote(text)
    return f"https://wa.me/{normalised}?text={encoded_text}"


# ─────────────────────────────────────────────
# Provider detection
# ─────────────────────────────────────────────

def _detect_provider() -> str:
    """
    Detect which WhatsApp provider to use based on env vars.
    Priority: explicit WHATSAPP_PROVIDER → auto-detect from credentials → mock
    """
    explicit = getattr(settings, "WHATSAPP_PROVIDER", None)
    if explicit:
        return explicit.lower()

    if getattr(settings, "TWILIO_ACCOUNT_SID", None) and getattr(settings, "TWILIO_AUTH_TOKEN", None):
        return "twilio"

    if getattr(settings, "META_WHATSAPP_TOKEN", None) and getattr(settings, "META_PHONE_NUMBER_ID", None):
        return "meta"

    return "mock"


# ─────────────────────────────────────────────
# Twilio sender
# ─────────────────────────────────────────────

async def _send_via_twilio(phone: str, text: str) -> bool:
    """
    Send a WhatsApp message using the Twilio Messaging API.
    Requires:
        TWILIO_ACCOUNT_SID  — Your Twilio Account SID
        TWILIO_AUTH_TOKEN   — Your Twilio Auth Token
        TWILIO_WHATSAPP_FROM — The WhatsApp-enabled Twilio number, e.g. "whatsapp:+14155238886"
    """
    account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", None)
    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", None)
    from_number = getattr(settings, "TWILIO_WHATSAPP_FROM", None)

    if not account_sid or not auth_token or not from_number:
        logger.error("[TWILIO] Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM")
        return False

    to_number = f"whatsapp:{to_e164(phone)}"
    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"

    # Twilio uses HTTP Basic Auth (account_sid:auth_token) + form-encoded body
    credentials = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()

    try:
        async with httpx.AsyncClient(trust_env=False, timeout=15.0) as client:
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                content=urllib.parse.urlencode({
                    "To": to_number,
                    "From": from_number,
                    "Body": text,
                }).encode(),
            )

        if resp.status_code in (200, 201):
            data = resp.json()
            logger.info(f"[TWILIO] Message sent to {phone} — SID: {data.get('sid')}")
            return True
        else:
            logger.error(f"[TWILIO] Error {resp.status_code}: {resp.text}")
            return False

    except Exception as exc:
        logger.error(f"[TWILIO] Exception: {exc}", exc_info=True)
        return False


# ─────────────────────────────────────────────
# Meta Cloud API sender
# ─────────────────────────────────────────────

async def _send_via_meta(phone: str, text: str) -> bool:
    """
    Send a WhatsApp message using the Meta (Facebook) Cloud API.
    Requires:
        META_WHATSAPP_TOKEN    — Permanent or temporary system user token
        META_PHONE_NUMBER_ID   — WhatsApp Business phone number ID (from Meta developer portal)
    Optional:
        META_API_VERSION       — Default "v19.0"
    """
    token = getattr(settings, "META_WHATSAPP_TOKEN", None)
    phone_number_id = getattr(settings, "META_PHONE_NUMBER_ID", None)
    api_version = getattr(settings, "META_API_VERSION", "v19.0")

    if not token or not phone_number_id:
        logger.error("[META] Missing META_WHATSAPP_TOKEN / META_PHONE_NUMBER_ID")
        return False

    url = f"https://graph.facebook.com/{api_version}/{phone_number_id}/messages"
    recipient = to_e164(phone)

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": recipient,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": text,
        },
    }

    try:
        async with httpx.AsyncClient(trust_env=False, timeout=15.0) as client:
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if resp.status_code in (200, 201):
            data = resp.json()
            msg_id = data.get("messages", [{}])[0].get("id", "unknown")
            logger.info(f"[META] Message sent to {recipient} — ID: {msg_id}")
            return True
        else:
            logger.error(f"[META] Error {resp.status_code}: {resp.text}")
            return False

    except Exception as exc:
        logger.error(f"[META] Exception: {exc}", exc_info=True)
        return False


# ─────────────────────────────────────────────
# Public send function
# ─────────────────────────────────────────────

async def send_whatsapp_message(phone: str, text: str) -> bool:
    """
    Send a WhatsApp message to a phone number.

    Auto-selects provider based on env configuration:
      - 'twilio': Uses Twilio WhatsApp API
      - 'meta':   Uses Meta (Facebook) Cloud API
      - 'mock':   Logs the message and returns True (for dev/testing)

    Returns True if the message was sent (or mocked) successfully.
    """
    normalised = format_moroccan_phone(phone)
    if not normalised:
        logger.error(f"[WA] Invalid or empty phone number: '{phone}'")
        return False

    provider = _detect_provider()

    if provider == "twilio":
        return await _send_via_twilio(normalised, text)

    elif provider == "meta":
        return await _send_via_meta(normalised, text)

    else:
        # MOCK — log message, return success (safe for development)
        logger.info(f"[WA MOCK] → +{normalised}:\n{text}\n")
        return True


# ─────────────────────────────────────────────
# Template helpers (re-usable message builders)
# ─────────────────────────────────────────────

def build_payment_reminder_text(
    player_name: str,
    amount: float,
    due_date: str,
    academy_name: str = "Academy",
    lang: str = "ar",
) -> str:
    """Build a bilingual payment reminder WhatsApp message."""
    if lang == "ar":
        return (
            f"⚽ *تذكير بالأداء — {academy_name}*\n\n"
            f"السلام عليكم،\n"
            f"نذكركم بأن أداء الاشتراك للاعب *{player_name}* بمبلغ *{amount:.2f} MAD* "
            f"قد حل موعده (تاريخ الاستحقاق: {due_date}).\n\n"
            f"يرجى تسوية الوضعية في أقرب وقت.\n\n"
            f"مع تحياتنا،\n"
            f"إدارة الأكاديمية"
        )
    return (
        f"⚽ *Rappel de paiement — {academy_name}*\n\n"
        f"Bonjour,\n"
        f"Nous vous rappelons que le paiement de l'abonnement pour *{player_name}* "
        f"d'un montant de *{amount:.2f} MAD* est dû (Échéance: {due_date}).\n\n"
        f"Merci de régulariser la situation.\n\n"
        f"Sportivement,\n"
        f"L'Administration"
    )


def build_absence_alert_text(
    player_name: str,
    date_str: str,
    academy_name: str = "Academy",
    lang: str = "ar",
) -> str:
    """Build a bilingual absence alert WhatsApp message."""
    if lang == "ar":
        return (
            f"⚽ *تنبيه غياب — {academy_name}*\n\n"
            f"السلام عليكم،\n"
            f"نود إخباركم بأنه تم تسجيل غياب اللاعب *{player_name}* "
            f"في حصة التدريب بتاريخ *{date_str}*.\n\n"
            f"إذا كان هذا الغياب مبرراً، يرجى إرسال التبرير للإدارة.\n\n"
            f"مع تحياتنا،\n"
            f"إدارة الأكاديمية"
        )
    return (
        f"⚽ *Alerte Absence — {academy_name}*\n\n"
        f"Bonjour,\n"
        f"Nous vous informons que le joueur *{player_name}* a été enregistré *absent* "
        f"à la séance d'entraînement du *{date_str}*.\n\n"
        f"Si cette absence est justifiée, merci d'en informer l'administration.\n\n"
        f"Sportivement,\n"
        f"L'Administration"
    )

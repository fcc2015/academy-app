"""
PayPal Payment Gateway integration for Academy SaaS.
Handles subscription payments from client academies.
"""
import logging
from fastapi import APIRouter, HTTPException, Request, status

logger = logging.getLogger("payments_gateway")
from pydantic import BaseModel, Field
from typing import Optional
from core.config import settings
from services.supabase_client import supabase
from services.email_service import send_payment_receipt
import httpx
import base64
import uuid
from datetime import datetime, timezone
from urllib.parse import quote

router = APIRouter(
    prefix="/payments/gateway",
    tags=["Payment Gateway"],
)


# ── Schemas ──

class CreateOrderRequest(BaseModel):
    academy_id: Optional[str] = None   # Optional for public landing page
    plan_id: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0, le=100_000)
    currency: str = Field("USD", pattern=r"^[A-Z]{3}$")
    description: str = Field("Academy SaaS Subscription", max_length=500)
    source: Optional[str] = Field(None, max_length=50)


class CaptureOrderRequest(BaseModel):
    order_id: str = Field(..., min_length=1, max_length=100)
    academy_id: str = Field(..., min_length=1, max_length=100)
    plan_id: str | None = Field(None, max_length=100)


# ── PayPal Auth Helper ──

async def get_paypal_access_token() -> str:
    """Get a PayPal OAuth2 access token using client credentials."""
    client_id = settings.PAYPAL_CLIENT_ID
    client_secret = settings.PAYPAL_CLIENT_SECRET

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=500,
            detail="PayPal credentials not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env"
        )

    base_url = get_paypal_base_url()
    auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        res = await client.post(
            f"{base_url}/v1/oauth2/token",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data="grant_type=client_credentials"
        )
        if res.status_code != 200:
            logger.error(f"PayPal auth failed: {res.status_code} - {res.text}")
            raise HTTPException(status_code=502, detail="Failed to authenticate with PayPal")
        return res.json()["access_token"]


def get_paypal_base_url() -> str:
    return "https://api-m.sandbox.paypal.com" if settings.PAYPAL_SANDBOX else "https://api-m.paypal.com"


# ── Create PayPal Order ──

@router.post("/create-order", dependencies=[])
async def create_paypal_order(req: CreateOrderRequest):
    """Create a PayPal order for academy subscription payment."""
    token = await get_paypal_access_token()
    base_url = get_paypal_base_url()

    # Use a temp UUID if no academy_id (public landing page flow)
    effective_academy_id = req.academy_id or f"temp_{uuid.uuid4().hex[:12]}"

    # Determine return URLs based on source
    if req.source == 'saas_landing':
        return_url = f"{settings.FRONTEND_URL}/saas-platform?payment=success"
        cancel_url = f"{settings.FRONTEND_URL}/saas-platform?payment=cancelled"
    elif req.source == 'parent_checkout':
        return_url = f"{settings.FRONTEND_URL}/parent/checkout?payment=success"
        cancel_url = f"{settings.FRONTEND_URL}/parent/checkout?payment=cancelled"
    else:
        aid = req.academy_id or ""
        pid = req.plan_id or ""
        return_url = f"{settings.FRONTEND_URL}/saas/subscriptions?payment=success&academy_id={aid}&plan_id={pid}"
        cancel_url = f"{settings.FRONTEND_URL}/saas/subscriptions?payment=cancelled"

    # Set custom_id and reference_id properly
    custom_id = f"parent|{req.academy_id}" if req.source == 'parent_checkout' else f"{effective_academy_id}|{req.plan_id}"
    ref_id = f"parent_{req.academy_id}" if req.source == 'parent_checkout' else f"academy_{effective_academy_id}"

    order_payload = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": ref_id,
            "description": req.description,
            "amount": {
                "currency_code": req.currency,
                "value": f"{req.amount:.2f}"
            },
            "custom_id": custom_id
        }],
        "application_context": {
            "brand_name": "Academy SaaS Platform",
            "landing_page": "NO_PREFERENCE",
            "user_action": "PAY_NOW",
            "return_url": return_url,
            "cancel_url": cancel_url,
        }
    }

    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        res = await client.post(
            f"{base_url}/v2/checkout/orders",
            json=order_payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }
        )

        if res.status_code not in [200, 201]:
            logger.error(f"PayPal order creation failed: {res.status_code} - {res.text}")
            raise HTTPException(status_code=502, detail=f"PayPal order creation failed: {res.text}")

        order = res.json()

        # Save pending payment record in DB — only if we have a real academy_id
        if req.academy_id:
            try:
                async with httpx.AsyncClient(trust_env=False, timeout=30.0) as db_client:
                    save_res = await db_client.post(
                        f"{supabase.url}/rest/v1/payment_transactions",
                        json={
                            "paypal_order_id": order["id"],
                            "academy_id": req.academy_id,
                            "plan_id": req.plan_id,
                            "amount": req.amount,
                            "currency": req.currency,
                            "status": "pending",
                            "created_at": datetime.now(timezone.utc).isoformat()
                        },
                        headers=supabase.admin_headers
                    )
                    if save_res.status_code not in [200, 201]:
                        logger.warning(f"DB save response: {save_res.status_code} - {save_res.text}")
            except Exception as e:
                logger.warning(f"Failed to save transaction record: {e}")

        # Return the approval URL for frontend redirect
        approve_link = next(
            (link["href"] for link in order.get("links", []) if link["rel"] == "approve"),
            None
        )

        return {
            "order_id": order["id"],
            "status": order["status"],
            "approve_url": approve_link
        }


# ── Capture PayPal Order (after user approves) ──

@router.post("/capture-order")
async def capture_paypal_order(req: CaptureOrderRequest):
    """Capture a PayPal order after the user has approved it."""
    token = await get_paypal_access_token()
    base_url = get_paypal_base_url()

    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        res = await client.post(
            f"{base_url}/v2/checkout/orders/{req.order_id}/capture",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }
        )

        if res.status_code not in [200, 201]:
            logger.error(f"PayPal capture failed: {res.status_code} - {res.text}")
            raise HTTPException(status_code=502, detail=f"PayPal capture failed: {res.text}")

        capture_data = res.json()
        capture_status = capture_data.get("status", "UNKNOWN")

        # Update transaction in DB
        try:
            capture_id = ""
            purchase_units = capture_data.get("purchase_units", [])
            if purchase_units:
                payments = purchase_units[0].get("payments", {})
                captures = payments.get("captures", [])
                if captures:
                    capture_id = captures[0].get("id", "")

            async with httpx.AsyncClient(trust_env=False, timeout=30.0) as db_client:
                await db_client.patch(
                    f"{supabase.url}/rest/v1/payment_transactions?paypal_order_id=eq.{req.order_id}",
                    json={
                        "status": "completed" if capture_status == "COMPLETED" else "failed",
                        "paypal_capture_id": capture_id,
                        "completed_at": datetime.now(timezone.utc).isoformat()
                    },
                    headers=supabase.admin_headers
                )
        except Exception as e:
            logger.warning(f"Failed to update transaction: {e}")

        # If successful, update academy subscription status + send receipt email
        if capture_status == "COMPLETED":
            try:
                update_data = {
                    "subscription_status": "active",
                    "last_payment_at": datetime.now(timezone.utc).isoformat()
                }
                # Also assign the plan if provided
                if req.plan_id:
                    update_data["plan_id"] = req.plan_id

                async with httpx.AsyncClient(trust_env=False, timeout=30.0) as db_client:
                    # check if this is a parent payment by checking if academy_id starts with parent|
                    is_parent = False
                    user_id = req.academy_id # defaults to academy_id from capture payload
                    try:
                        # try to get custom_id
                        custom_id = capture_data.get("purchase_units", [])[0].get("custom_id", "")
                        if custom_id.startswith("parent|"):
                            is_parent = True
                            user_id = custom_id.split("|")[1]
                    except Exception:
                        pass
                    
                    if is_parent:
                        await db_client.patch(
                            f"{supabase.url}/rest/v1/users?id=eq.{user_id}",
                            json={"account_status": "Active"},
                            headers=supabase.admin_headers
                        )
                    else:
                        await db_client.patch(
                            f"{supabase.url}/rest/v1/academies?id=eq.{req.academy_id}",
                            json=update_data,
                            headers=supabase.admin_headers
                        )
            except Exception as e:
                logger.warning(f"Failed to update subscription/account status: {e}")

            # Receipt email — non-blocking: capture must succeed even if email fails
            try:
                payer_email = ""
                payer_name = ""
                amount_value = 0.0
                currency = "USD"
                try:
                    payer = capture_data.get("payer", {})
                    payer_email = payer.get("email_address", "") or ""
                    payer_name_obj = payer.get("name", {}) or {}
                    payer_name = (
                        f"{payer_name_obj.get('given_name', '')} {payer_name_obj.get('surname', '')}"
                    ).strip() or payer_email.split("@")[0]
                    units = capture_data.get("purchase_units") or []
                    if units:
                        captures = (units[0].get("payments") or {}).get("captures") or []
                        if captures:
                            amt = captures[0].get("amount") or {}
                            amount_value = float(amt.get("value") or 0)
                            currency = amt.get("currency_code") or currency
                except Exception as parse_err:
                    logger.warning(f"Failed to parse capture payload for receipt: {parse_err}")

                if payer_email:
                    send_payment_receipt(
                        to=payer_email,
                        payer_name=payer_name or "Customer",
                        amount=amount_value,
                        currency=currency,
                        plan_name=req.plan_id or "Subscription",
                        order_id=req.order_id,
                        paid_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
                    )
            except Exception as mail_err:
                logger.warning(f"Receipt email failed for order {req.order_id}: {mail_err}")

        return {
            "success": capture_status == "COMPLETED",
            "status": capture_status,
            "order_id": req.order_id,
            "details": capture_data
        }


# ── Manual Payment Verification ──

@router.post("/verify-order/{paypal_order_id}", dependencies=[])
async def verify_paypal_order(paypal_order_id: str):
    """
    Check PayPal order status and capture it if APPROVED.
    Used for manual verification when automatic capture failed.
    """
    token = await get_paypal_access_token()
    base_url = get_paypal_base_url()

    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
        # 1. Get order status from PayPal
        order_res = await client.get(
            f"{base_url}/v2/checkout/orders/{paypal_order_id}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        if order_res.status_code != 200:
            raise HTTPException(status_code=404, detail="Order not found in PayPal.")

        order_data = order_res.json()
        paypal_status = order_data.get("status")  # CREATED, APPROVED, COMPLETED, VOIDED

        if paypal_status == "COMPLETED":
            # Already captured — just update DB to completed
            async with httpx.AsyncClient(trust_env=False, timeout=30.0) as db:
                await db.patch(
                    f"{supabase.url}/rest/v1/payment_transactions?paypal_order_id=eq.{paypal_order_id}",
                    json={"status": "completed"},
                    headers=supabase.admin_headers,
                )
            return {"success": True, "status": "COMPLETED", "message": "Payment already completed — DB updated."}

        if paypal_status != "APPROVED":
            return {
                "success": False,
                "status": paypal_status,
                "message": f"Cannot capture: order status is {paypal_status}. Customer must approve first.",
            }

        # 2. Capture the approved order
        capture_res = await client.post(
            f"{base_url}/v2/checkout/orders/{paypal_order_id}/capture",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        if capture_res.status_code not in [200, 201]:
            raise HTTPException(status_code=502, detail="Payment capture failed. Please try again.")

        capture_data = capture_res.json()
        capture_status = capture_data.get("status")
        capture_id = ""
        try:
            capture_id = capture_data["purchase_units"][0]["payments"]["captures"][0]["id"]
        except (KeyError, IndexError):
            pass

        custom_id = ""
        try:
            custom_id = capture_data["purchase_units"][0].get("custom_id", "")
        except (KeyError, IndexError):
            pass

        # 3. Update payment_transactions in DB
        async with httpx.AsyncClient(trust_env=False, timeout=30.0) as db:
            await db.patch(
                f"{supabase.url}/rest/v1/payment_transactions?paypal_order_id=eq.{paypal_order_id}",
                json={
                    "status": "completed" if capture_status == "COMPLETED" else "failed",
                    "paypal_capture_id": capture_id,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                },
                headers=supabase.admin_headers,
            )

            # 4. Update academy subscription if custom_id has academy_id|plan_id
            if custom_id and "|" in custom_id:
                academy_id, plan_id = custom_id.split("|", 1)
                await db.patch(
                    f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
                    json={
                        "subscription_status": "active",
                        "plan_id": plan_id,
                        "last_payment_at": datetime.now(timezone.utc).isoformat(),
                    },
                    headers=supabase.admin_headers,
                )

        return {
            "success": capture_status == "COMPLETED",
            "status": capture_status,
            "paypal_capture_id": capture_id,
            "message": "Payment captured and subscription activated." if capture_status == "COMPLETED" else "Capture failed.",
        }


# ── Get Payment History ──

@router.get("/transactions/{academy_id}", dependencies=[])
async def get_payment_transactions(academy_id: str):
    """Get payment transaction history for an academy."""
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
            res = await client.get(
                f"{supabase.url}/rest/v1/payment_transactions?academy_id=eq.{academy_id}&order=created_at.desc",
                headers=supabase.admin_headers
            )
            if res.status_code == 200:
                return res.json()
            return []
    except Exception:
        return []


# ── PayPal Webhook Signature Verification ──

async def verify_paypal_webhook_signature(request: Request, raw_body: bytes) -> bool:
    """
    Verify PayPal webhook signature using PayPal's verify-webhook-signature API.
    Returns True if valid, False otherwise.
    Skips verification if PAYPAL_WEBHOOK_ID is not configured (logs a warning).
    """
    webhook_id = settings.PAYPAL_WEBHOOK_ID
    if not webhook_id:
        logger.warning("PAYPAL_WEBHOOK_ID not set — skipping webhook signature verification (set it in .env for production)")
        return True

    transmission_id = request.headers.get("PAYPAL-TRANSMISSION-ID", "")
    transmission_time = request.headers.get("PAYPAL-TRANSMISSION-TIME", "")
    cert_url = request.headers.get("PAYPAL-CERT-URL", "")
    auth_algo = request.headers.get("PAYPAL-AUTH-ALGO", "")
    transmission_sig = request.headers.get("PAYPAL-TRANSMISSION-SIG", "")

    if not all([transmission_id, transmission_time, cert_url, auth_algo, transmission_sig]):
        logger.warning("Webhook missing PayPal signature headers — rejecting")
        return False

    try:
        token = await get_paypal_access_token()
        base_url = get_paypal_base_url()
        async with httpx.AsyncClient(trust_env=False, timeout=15.0) as client:
            res = await client.post(
                f"{base_url}/v1/notifications/verify-webhook-signature",
                json={
                    "auth_algo": auth_algo,
                    "cert_url": cert_url,
                    "transmission_id": transmission_id,
                    "transmission_sig": transmission_sig,
                    "transmission_time": transmission_time,
                    "webhook_id": webhook_id,
                    "webhook_event": raw_body.decode("utf-8"),
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            if res.status_code == 200:
                verification_status = res.json().get("verification_status", "")
                return verification_status == "SUCCESS"
            logger.error(f"PayPal webhook verification API returned {res.status_code}: {res.text}")
            return False
    except Exception as e:
        logger.error(f"Webhook signature verification error: {e}")
        return False


# ── PayPal Webhook (for async notifications) ──

@router.post("/webhook")
async def paypal_webhook(request: Request):
    """Handle PayPal webhook events — verifies signature before processing."""
    raw_body = await request.body()

    # Verify signature first — reject forged requests
    if not await verify_paypal_webhook_signature(request, raw_body):
        logger.warning(f"Rejected PayPal webhook with invalid signature from {request.client.host if request.client else 'unknown'}")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        body = __import__("json").loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_type = body.get("event_type", "")

    if event_type == "PAYMENT.CAPTURE.COMPLETED":
        resource = body.get("resource", {})
        custom_id = resource.get("custom_id", "")
        if custom_id.startswith("parent|"):
            user_id = custom_id.split("|")[1]
            try:
                async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
                    await client.patch(
                        f"{supabase.url}/rest/v1/users?id=eq.{user_id}",
                        json={"account_status": "Active"},
                        headers=supabase.admin_headers
                    )
            except Exception as e:
                logger.error(f"Parent Webhook handler error: {e}")
        elif "|" in custom_id:
            academy_id, plan_id = custom_id.split("|", 1)
            try:
                async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
                    await client.patch(
                        f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
                        json={
                            "subscription_status": "active",
                            "plan_id": plan_id,
                            "last_payment_at": datetime.now(timezone.utc).isoformat()
                        },
                        headers=supabase.admin_headers
                    )
            except Exception as e:
                logger.error(f"Webhook handler error: {e}")

    return {"status": "ok"}


# ── Health Check ──

@router.get("/status")
def payment_status():
    """Check PayPal gateway configuration status."""
    has_credentials = bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET)
    return {
        "configured": has_credentials,
        "mode": "sandbox" if settings.PAYPAL_SANDBOX else "live",
        "frontend_url": settings.FRONTEND_URL
    }


# =========================================================
# STRIPE GATEWAY
# =========================================================

import stripe
import os

class CreateStripeSessionRequest(BaseModel):
    academy_id: str
    plan_id: str
    amount: float
    currency: str = "mad"
    description: str = "Academy SaaS Subscription"

class StripeWebhookRequest(BaseModel):
    pass

@router.post("/stripe/create-checkout-session")
async def create_stripe_checkout_session(req: CreateStripeSessionRequest):
    """Create a Stripe Checkout Session for subscription payment."""
    stripe_key = os.getenv("STRIPE_SECRET_KEY") or "mock_stripe_key_for_testing"
    stripe.api_key = stripe_key

    # URLs for redirection after payment
    success_url = f"{settings.FRONTEND_URL}/saas/subscriptions?payment=success&provider=stripe&academy_id={req.academy_id}&plan_id={req.plan_id}"
    cancel_url = f"{settings.FRONTEND_URL}/saas/subscriptions?payment=cancelled"

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": req.currency.lower(),
                    "product_data": {
                        "name": req.plan_id.upper(),
                        "description": req.description,
                    },
                    "unit_amount": int(req.amount * 100), # Stripe expects amount in cents
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=f"{req.academy_id}|{req.plan_id}",
            metadata={
                "academy_id": req.academy_id,
                "plan_id": req.plan_id,
            }
        )

        # Save pending transaction to DB
        try:
            async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
                await client.post(
                    f"{supabase.url}/rest/v1/payment_transactions",
                    json={
                        "paypal_order_id": f"stripe_{session.id[:20]}", # reuse order_id column for Stripe session reference
                        "academy_id": req.academy_id,
                        "plan_id": req.plan_id,
                        "amount": req.amount,
                        "currency": req.currency,
                        "status": "pending",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    },
                    headers=supabase.admin_headers
                )
        except Exception as db_err:
            logger.warning(f"Failed to record pending Stripe session: {db_err}")

        return {
            "session_id": session.id,
            "checkout_url": session.url
        }
    except Exception as e:
        logger.error(f"Stripe session creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Stripe integration failed: {str(e)}")


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe Webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET") or "mock_webhook_secret"

    try:
        # Verify webhook signature in production, fallback to generic parsing in dev
        if webhook_secret and not webhook_secret.startswith("mock"):
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            import json
            event_data = json.loads(payload.decode("utf-8"))
            event = stripe.Event.construct_from(event_data, stripe.api_key)

        if event.type == "checkout.session.completed":
            session = event.data.object
            client_ref = session.get("client_reference_id")
            session_id = session.get("id") or getattr(session, "id", "")
            if client_ref and "|" in client_ref:
                academy_id, plan_id = client_ref.split("|", 1)
                
                # Update transaction in DB
                async with httpx.AsyncClient(trust_env=False, timeout=15.0) as client:
                    await client.patch(
                        f"{supabase.url}/rest/v1/payment_transactions?paypal_order_id=eq.stripe_{session_id[:20]}",
                        json={
                            "status": "completed",
                            "completed_at": datetime.now(timezone.utc).isoformat()
                        },
                        headers=supabase.admin_headers
                    )
                    
                    # Update academy subscription status
                    await client.patch(
                        f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
                        json={
                            "subscription_status": "active",
                            "plan_id": plan_id,
                            "last_payment_at": datetime.now(timezone.utc).isoformat()
                        },
                        headers=supabase.admin_headers
                    )
                    logger.info(f"Stripe subscription activated successfully for {academy_id} - {plan_id}")

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Stripe Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# =========================================================
# MOROCCAN CASH DEPOSITS (Wafacash / CashPlus)
# =========================================================

class CashPaymentRequest(BaseModel):
    academy_id: str
    plan_id: str
    amount: float
    provider: str  # "wafacash" or "cashplus"

class CashConfirmRequest(BaseModel):
    transaction_id: str
    deposit_proof_reference: str

@router.post("/cash/generate-code")
async def generate_cash_payment_code(req: CashPaymentRequest):
    """
    Generate a cash payment reference code (Wafacash / CashPlus).
    Creates a pending transaction in state 'waiting_deposit'.
    """
    import random
    prefix = "WC" if req.provider.lower() == "wafacash" else "CP"
    random_code = f"{prefix}-{random.randint(100000, 999999)}"
    
    transaction_data = {
        "paypal_order_id": random_code, # Reuse order_id column for cash reference code
        "academy_id": req.academy_id,
        "plan_id": req.plan_id,
        "amount": req.amount,
        "currency": "MAD",
        "status": "waiting_deposit",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "paypal_capture_id": req.provider.upper() # Store provider type in capture_id column
    }

    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            res = await client.post(
                f"{supabase.url}/rest/v1/payment_transactions",
                json=transaction_data,
                headers=supabase.admin_headers
            )
            if res.status_code not in (200, 201):
                logger.error(f"DB insert failed: {res.text}")
                raise HTTPException(status_code=500, detail="Failed to save cash transaction.")
    except Exception as e:
        logger.error(f"Cash transaction save error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "success": True,
        "provider": req.provider.upper(),
        "payment_code": random_code,
        "amount": req.amount,
        "instructions": (
            f"Veuillez vous rendre dans une agence {req.provider.upper()} "
            f"et effectuer un versement de {req.amount:.2f} MAD "
            f"avec le code de référence : {random_code}."
        )
    }

@router.post("/cash/confirm-deposit")
async def confirm_cash_deposit(req: CashConfirmRequest):
    """
    Confirm Wafacash / CashPlus deposit by deposit proof reference.
    Marks transaction as completed and activates subscription.
    """
    async with httpx.AsyncClient(trust_env=False, timeout=15.0) as client:
        # 1. Fetch the transaction
        tx_res = await client.get(
            f"{supabase.url}/rest/v1/payment_transactions?paypal_order_id=eq.{quote(req.transaction_id)}&select=*",
            headers=supabase.admin_headers
        )
        if tx_res.status_code != 200 or not tx_res.json():
            raise HTTPException(status_code=404, detail="Cash transaction not found.")
            
        tx = tx_res.json()[0]
        if tx.get("status") == "completed":
            return {"success": True, "message": "Transaction already completed."}
            
        academy_id = tx.get("academy_id")
        plan_id = tx.get("plan_id")
        
        # 2. Update transaction status
        await client.patch(
            f"{supabase.url}/rest/v1/payment_transactions?paypal_order_id=eq.{quote(req.transaction_id)}",
            json={
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "paypal_capture_id": f"{tx.get('paypal_capture_id', 'CASH')}|PROOF:{req.deposit_proof_reference}"
            },
            headers=supabase.admin_headers
        )
        
        # 3. Activate subscription
        await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json={
                "subscription_status": "active",
                "plan_id": plan_id,
                "last_payment_at": datetime.now(timezone.utc).isoformat()
            },
            headers=supabase.admin_headers
        )
        
    return {"success": True, "message": f"Cash deposit confirmed successfully for {academy_id}. Subscription activated!"}

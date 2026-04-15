"""
PayPal Payment Gateway integration for Academy SaaS.
Handles subscription payments from client academies.
"""
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from typing import Optional
from core.config import settings
from services.supabase_client import supabase
import httpx
import base64
import uuid
from datetime import datetime, timezone

router = APIRouter(
    prefix="/payments/gateway",
    tags=["Payment Gateway"],
)


# ── Schemas ──

class CreateOrderRequest(BaseModel):
    academy_id: Optional[str] = None   # Optional for public landing page
    plan_id: str
    amount: float
    currency: str = "USD"
    description: str = "Academy SaaS Subscription"
    source: Optional[str] = None       # e.g. 'saas_landing'


class CaptureOrderRequest(BaseModel):
    order_id: str
    academy_id: str
    plan_id: str | None = None


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

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f"{base_url}/v1/oauth2/token",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data="grant_type=client_credentials"
        )
        if res.status_code != 200:
            print(f"⚠️ PayPal auth failed: {res.status_code} - {res.text}")
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
    else:
        aid = req.academy_id or ""
        pid = req.plan_id or ""
        return_url = f"{settings.FRONTEND_URL}/saas/subscriptions?payment=success&academy_id={aid}&plan_id={pid}"
        cancel_url = f"{settings.FRONTEND_URL}/saas/subscriptions?payment=cancelled"

    order_payload = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": f"academy_{effective_academy_id}",
            "description": req.description,
            "amount": {
                "currency_code": req.currency,
                "value": f"{req.amount:.2f}"
            },
            "custom_id": f"{effective_academy_id}|{req.plan_id}"
        }],
        "application_context": {
            "brand_name": "Academy SaaS Platform",
            "landing_page": "NO_PREFERENCE",
            "user_action": "PAY_NOW",
            "return_url": return_url,
            "cancel_url": cancel_url,
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f"{base_url}/v2/checkout/orders",
            json=order_payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }
        )

        if res.status_code not in [200, 201]:
            print(f"⚠️ PayPal order creation failed: {res.status_code} - {res.text}")
            raise HTTPException(status_code=502, detail=f"PayPal order creation failed: {res.text}")

        order = res.json()

        # Save pending payment record in DB — only if we have a real academy_id
        if req.academy_id:
            try:
                async with httpx.AsyncClient(timeout=30.0) as db_client:
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
                        print(f"⚠️ DB save response: {save_res.status_code} - {save_res.text}")
            except Exception as e:
                print(f"⚠️ Failed to save transaction record: {e}")

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

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f"{base_url}/v2/checkout/orders/{req.order_id}/capture",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }
        )

        if res.status_code not in [200, 201]:
            print(f"⚠️ PayPal capture failed: {res.status_code} - {res.text}")
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

            async with httpx.AsyncClient(timeout=30.0) as db_client:
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
            print(f"⚠️ Failed to update transaction: {e}")

        # If successful, update academy subscription status
        if capture_status == "COMPLETED":
            try:
                update_data = {
                    "subscription_status": "active",
                    "last_payment_at": datetime.now(timezone.utc).isoformat()
                }
                # Also assign the plan if provided
                if req.plan_id:
                    update_data["plan_id"] = req.plan_id

                async with httpx.AsyncClient(timeout=30.0) as db_client:
                    await db_client.patch(
                        f"{supabase.url}/rest/v1/academies?id=eq.{req.academy_id}",
                        json=update_data,
                        headers=supabase.admin_headers
                    )
            except Exception as e:
                print(f"⚠️ Failed to update academy subscription: {e}")

        return {
            "success": capture_status == "COMPLETED",
            "status": capture_status,
            "order_id": req.order_id,
            "details": capture_data
        }


# ── Get Payment History ──

@router.get("/transactions/{academy_id}", dependencies=[])
async def get_payment_transactions(academy_id: str):
    """Get payment transaction history for an academy."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(
                f"{supabase.url}/rest/v1/payment_transactions?academy_id=eq.{academy_id}&order=created_at.desc",
                headers=supabase.admin_headers
            )
            if res.status_code == 200:
                return res.json()
            return []
    except Exception:
        return []


# ── PayPal Webhook (for async notifications) ──

@router.post("/webhook")
async def paypal_webhook(request: Request):
    """Handle PayPal webhook events (IPN-style notifications)."""
    body = await request.json()
    event_type = body.get("event_type", "")

    if event_type == "PAYMENT.CAPTURE.COMPLETED":
        resource = body.get("resource", {})
        custom_id = resource.get("custom_id", "")
        if "|" in custom_id:
            academy_id, plan_id = custom_id.split("|", 1)
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
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
                print(f"⚠️ Webhook handler error: {e}")

    return {"status": "ok"}


# ── Health Check ──

@router.get("/status")
async def payment_status():
    """Check PayPal gateway configuration status."""
    has_credentials = bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET)
    return {
        "configured": has_credentials,
        "mode": "sandbox" if settings.PAYPAL_SANDBOX else "live",
        "frontend_url": settings.FRONTEND_URL
    }

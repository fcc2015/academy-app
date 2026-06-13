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


def is_valid_uuid(val: str | None) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False


# ── Schemas ──

class CreateOrderRequest(BaseModel):
    academy_id: Optional[str] = None   # Optional for public landing page
    plan_id: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0, le=100_000)
    currency: str = Field("USD", pattern=r"^[A-Z]{3}$")
    description: str = Field("Academy SaaS Subscription", max_length=500)
    source: Optional[str] = Field(None, max_length=50)
    billing_cycle_type: Optional[str] = "monthly"  # "monthly" or "yearly"


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


# ── Lemon Squeezy Sandbox Configuration ──
# Basic:      monthly=1748453 | yearly=1748330
# Pro:        monthly=1748483 | yearly=1748646
# Enterprise: yearly=1748545

LEMON_SQUEEZY_VARIANTS = {
    "basic": {
        "monthly": "1748453",
        "yearly":  "1748330"
    },
    "pro": {
        "monthly": "1748483",
        "yearly":  "1748646"
    },
    "enterprise": {
        # Enterprise is yearly-only — no monthly plan
        "monthly": None,
        "yearly":  "1748545"
    }
}

async def get_ls_credentials() -> tuple[str | None, str | None]:
    """
    Get Lemon Squeezy API Key and Signing Secret.
    Priority: saas_settings DB row → .env variables
    """
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=5.0) as client:
            res = await client.get(
                f"{supabase.url}/rest/v1/saas_settings?select=lemon_squeezy_api_key,lemon_squeezy_signing_secret&limit=1",
                headers=supabase.admin_headers
            )
            if res.status_code == 200 and res.json():
                row = res.json()[0]
                db_api_key = row.get("lemon_squeezy_api_key") or ""
                db_signing = row.get("lemon_squeezy_signing_secret") or ""
                if db_api_key.strip():
                    return db_api_key.strip(), (db_signing.strip() or settings.LEMON_SQUEEZY_SIGNING_SECRET)
    except Exception as e:
        logger.debug(f"Could not fetch LS credentials from DB: {e}")
    return settings.LEMON_SQUEEZY_API_KEY, settings.LEMON_SQUEEZY_SIGNING_SECRET


async def get_lemonsqueezy_store_id() -> str:
    """Retrieve the Lemon Squeezy store ID dynamically, falling back to 397704."""
    api_key, _ = await get_ls_credentials()
    if not api_key:
        return "397704"
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            res = await client.get(
                "https://api.lemonsqueezy.com/v1/stores",
                headers={
                    "Accept": "application/vnd.api+json",
                    "Content-Type": "application/vnd.api+json",
                    "Authorization": f"Bearer {api_key}"
                }
            )
            if res.status_code == 200:
                data = res.json()
                if data.get("data") and len(data["data"]) > 0:
                    return str(data["data"][0]["id"])
    except Exception as e:
        logger.error(f"Failed to fetch Lemon Squeezy store ID dynamically: {e}")
    return "397704"


# ── Sources routing map ──
# Trigger CI rebuild after restoring requirements-dev.txt
# SaaS → Academy subscriptions  : source in ('saas_landing', 'saas_dashboard') → Lemon Squeezy
# Academy → Player/Parent payments: all other sources                          → PayPal

_SAAS_SOURCES = {"saas_landing", "saas_dashboard", "academy_subscription"}  # ONLY these go to Lemon Squeezy


# ── Create Payment Order ──

@router.post("/create-order", dependencies=[])
async def create_paypal_order(req: CreateOrderRequest):
    """Route payment to the correct gateway:
    - Lemon Squeezy → SaaS platform subscriptions (academy owners paying US)
    - PayPal         → Academy-internal payments (parents/players paying the academy)
    """
    effective_academy_id = req.academy_id or f"temp_{uuid.uuid4().hex[:12]}"

    # ══ GATE: Is this a SaaS subscription purchase? ══
    _ls_api_key_check, _ = await get_ls_credentials()
    is_saas_purchase = (
        req.source in _SAAS_SOURCES
        and bool(_ls_api_key_check)
    )

    # ── PayPal Path — Academy internal payments (parents / players) ──
    if not is_saas_purchase:
        token = await get_paypal_access_token()
        base_url = get_paypal_base_url()
        
        if req.source in ('saas_dashboard', 'saas_dashboard_paypal'):
            return_url = f"{settings.FRONTEND_URL}/saas/subscriptions?payment=success&academy_id={req.academy_id}&plan_id={req.plan_id or ''}"
            cancel_url = f"{settings.FRONTEND_URL}/saas/subscriptions?payment=cancelled"
            custom_id = f"saas|{req.academy_id}|{req.plan_id or ''}|{req.billing_cycle_type or 'monthly'}"
            ref_id = f"saas_{req.academy_id}"
        elif req.source in ('saas_landing', 'saas_landing_paypal'):
            return_url = f"{settings.FRONTEND_URL}/saas-platform?payment=success&academy_id={req.academy_id}&plan_id={req.plan_id or ''}"
            cancel_url = f"{settings.FRONTEND_URL}/saas-platform?payment=cancelled"
            custom_id = f"saas_signup|{req.academy_id}|{req.plan_id or ''}|{req.billing_cycle_type or 'monthly'}"
            ref_id = f"saas_signup_{req.academy_id}"
        elif req.source in ('academy_subscription', 'academy_subscription_paypal'):
            return_url = f"{settings.FRONTEND_URL}/admin/subscription?payment=success&academy_id={req.academy_id}&plan_id={req.plan_id or ''}"
            cancel_url = f"{settings.FRONTEND_URL}/admin/subscription?payment=cancelled"
            custom_id = f"academy|{req.academy_id}|{req.plan_id or ''}|{req.billing_cycle_type or 'monthly'}"
            ref_id = f"academy_{req.academy_id}"
        else:
            return_url = f"{settings.FRONTEND_URL}/parent/checkout?payment=success"
            cancel_url = f"{settings.FRONTEND_URL}/parent/checkout?payment=cancelled"
            custom_id = f"parent|{req.academy_id}"
            ref_id = f"parent_{req.academy_id}"
        
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
            
            if req.academy_id:
                try:
                    async with httpx.AsyncClient(trust_env=False, timeout=30.0) as db_client:
                        await db_client.post(
                            f"{supabase.url}/rest/v1/payment_transactions",
                            json={
                                "paypal_order_id": order["id"],
                                "academy_id": req.academy_id,
                                "plan_id": req.plan_id if is_valid_uuid(req.plan_id) else None,
                                "amount": req.amount,
                                "currency": req.currency,
                                "status": "pending",
                                "created_at": datetime.now(timezone.utc).isoformat(),
                                "billing_cycle_type": req.billing_cycle_type or "monthly"
                            },
                            headers=supabase.admin_headers
                        )
                except Exception as e:
                    logger.warning(f"Failed to save transaction record: {e}")
                    
            approve_link = next(
                (link["href"] for link in order.get("links", []) if link["rel"] == "approve"),
                None
            )
            return {
                "order_id": order["id"],
                "status": order["status"],
                "approve_url": approve_link
            }

    # ── Lemon Squeezy Path — SaaS subscriptions ONLY (academy owners paying US) ──
    else:
        api_key, _ = await get_ls_credentials()
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="Lemon Squeezy API Key not configured. Only SaaS subscription purchases use this path."
            )
            
        store_id = await get_lemonsqueezy_store_id()
        plan_id_lower = (req.plan_id or "pro").lower()
        billing_cycle_lower = (req.billing_cycle_type or "monthly").lower()
        
        mapped_plan = "pro"
        if "basic" in plan_id_lower:
            mapped_plan = "basic"
        elif "enterprise" in plan_id_lower:
            mapped_plan = "enterprise"

        variant_map = LEMON_SQUEEZY_VARIANTS.get(mapped_plan) or LEMON_SQUEEZY_VARIANTS["pro"]

        # Enterprise is yearly-only — force yearly cycle
        if mapped_plan == "enterprise":
            billing_cycle_lower = "yearly"

        variant_id = variant_map.get(billing_cycle_lower) or variant_map.get("yearly") or variant_map.get("monthly")

        if not variant_id:
            raise HTTPException(
                status_code=400,
                detail=f"Lemon Squeezy variant not configured for plan '{mapped_plan}' ({billing_cycle_lower}). Please create it in the LS dashboard first."
            )
        
        # Determine success URL
        if req.source == 'saas_landing':
            return_url = f"{settings.FRONTEND_URL}/saas-platform?payment=success&academy_id={effective_academy_id}&plan_id={mapped_plan}"
        elif req.source == 'academy_subscription':
            return_url = f"{settings.FRONTEND_URL}/admin/subscription?payment=success&academy_id={effective_academy_id}&plan_id={mapped_plan}"
        else:
            return_url = f"{settings.FRONTEND_URL}/saas/subscriptions?payment=success&academy_id={effective_academy_id}&plan_id={mapped_plan}"
            
        checkout_payload = {
            "data": {
                "type": "checkouts",
                "attributes": {
                    "checkout_data": {
                        "custom": {
                            "academy_id": effective_academy_id,
                            "plan_id": mapped_plan,
                            "billing_cycle_type": billing_cycle_lower
                        }
                    },
                    "product_options": {
                        "redirect_url": return_url
                    }
                },
                "relationships": {
                    "store": {
                        "data": {
                            "type": "stores",
                            "id": store_id
                        }
                    },
                    "variant": {
                        "data": {
                            "type": "variants",
                            "id": variant_id
                        }
                    }
                }
            }
        }
        
        async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
            res = await client.post(
                "https://api.lemonsqueezy.com/v1/checkouts",
                json=checkout_payload,
                headers={
                    "Accept": "application/vnd.api+json",
                    "Content-Type": "application/vnd.api+json",
                    "Authorization": f"Bearer {api_key}"
                }
            )
            if res.status_code not in [200, 201]:
                logger.error(f"Lemon Squeezy checkout failed: {res.status_code} - {res.text}")
                raise HTTPException(status_code=502, detail=f"Lemon Squeezy checkout generation failed: {res.text}")
                
            checkout_data = res.json()
            checkout_id = checkout_data["data"]["id"]
            checkout_url = checkout_data["data"]["attributes"]["url"]
            
            # Pass return_url with token={checkout_id} so the frontend redirect handles success properly
            success_redirect_url = f"{return_url}&token={checkout_id}"
            
            # Re-request checkout link with updated redirect url to pass token
            checkout_payload["data"]["attributes"]["product_options"]["redirect_url"] = success_redirect_url
            
            res_retry = await client.post(
                "https://api.lemonsqueezy.com/v1/checkouts",
                json=checkout_payload,
                headers={
                    "Accept": "application/vnd.api+json",
                    "Content-Type": "application/vnd.api+json",
                    "Authorization": f"Bearer {api_key}"
                }
            )
            if res_retry.status_code in [200, 201]:
                checkout_data = res_retry.json()
                checkout_id = checkout_data["data"]["id"]
                checkout_url = checkout_data["data"]["attributes"]["url"]
                
            # Create a pending payment transaction in Supabase
            if req.academy_id:
                try:
                    await client.post(
                        f"{supabase.url}/rest/v1/payment_transactions",
                        json={
                            "paypal_order_id": f"lemonsqueezy_{checkout_id}",
                            "academy_id": req.academy_id,
                            "plan_id": mapped_plan if is_valid_uuid(mapped_plan) else None,
                            "amount": req.amount,
                            "currency": req.currency,
                            "status": "pending",
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "billing_cycle_type": billing_cycle_lower
                        },
                        headers=supabase.admin_headers
                    )
                except Exception as e:
                    logger.warning(f"Failed to save Lemon Squeezy transaction: {e}")
                    
            return {
                "order_id": checkout_id,
                "status": "APPROVED",
                "approve_url": checkout_url
            }


@router.post("/capture-order")
async def capture_paypal_order(req: CaptureOrderRequest):
    """Capture PayPal or Lemon Squeezy order."""
    
    # ── Lemon Squeezy Order Verification ──
    is_lemonsqueezy = False
    if settings.LEMON_SQUEEZY_API_KEY:
        import re
        if re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", req.order_id.lower()):
            is_lemonsqueezy = True
            
    if is_lemonsqueezy:
        api_key, _ = await get_ls_credentials()
        async with httpx.AsyncClient(trust_env=False, timeout=20.0) as ls_client:
            res = await ls_client.get(
                f"https://api.lemonsqueezy.com/v1/checkouts/{req.order_id}",
                headers={
                    "Accept": "application/vnd.api+json",
                    "Authorization": f"Bearer {api_key}"
                }
            )
            if res.status_code != 200:
                logger.error(f"Lemon Squeezy verification failed for {req.order_id}: {res.text}")
                raise HTTPException(status_code=400, detail="Invalid checkout session.")
                
            checkout_data = res.json()
            custom_data = checkout_data.get("data", {}).get("attributes", {}).get("checkout_data", {}).get("custom", {})
            
            academy_id = custom_data.get("academy_id")
            plan_id = custom_data.get("plan_id", "pro")
            billing_cycle_type = custom_data.get("billing_cycle_type", "monthly")
            
            now_iso = datetime.now(timezone.utc).isoformat()
            tx_ref = f"lemonsqueezy_{req.order_id}"
            
            async with httpx.AsyncClient(trust_env=False, timeout=20.0) as db_client:
                # Update transaction
                tx_check = await db_client.get(
                    f"{supabase.url}/rest/v1/payment_transactions?paypal_order_id=eq.{tx_ref}",
                    headers=supabase.admin_headers
                )
                if tx_check.status_code == 200 and tx_check.json():
                    await db_client.patch(
                        f"{supabase.url}/rest/v1/payment_transactions?paypal_order_id=eq.{tx_ref}",
                        json={
                            "status": "completed",
                            "completed_at": now_iso
                        },
                        headers=supabase.admin_headers
                    )
                else:
                    await db_client.post(
                        f"{supabase.url}/rest/v1/payment_transactions",
                        json={
                            "paypal_order_id": tx_ref,
                            "academy_id": req.academy_id or academy_id or "pending",
                            "plan_id": plan_id if is_valid_uuid(plan_id) else None,
                            "amount": 499.0,
                            "currency": "MAD",
                            "status": "completed",
                            "created_at": now_iso,
                            "completed_at": now_iso,
                            "billing_cycle_type": billing_cycle_type
                        },
                        headers=supabase.admin_headers
                    )
                    
                # Activate academy subscription
                target_academy_id = req.academy_id or academy_id
                if target_academy_id and not target_academy_id.startswith("temp_") and not target_academy_id.startswith("pending_"):
                    cycle_days = 365 if billing_cycle_type == "yearly" else 30
                    from datetime import timedelta
                    end_dt = datetime.now(timezone.utc) + timedelta(days=cycle_days)
                    grace_dt = end_dt + timedelta(days=7)
                    
                    await db_client.patch(
                        f"{supabase.url}/rest/v1/academies?id=eq.{target_academy_id}",
                        json={
                            "subscription_status": "active",
                            "status": "active",
                            "plan_id": plan_id,
                            "last_payment_at": now_iso,
                            "billing_cycle_start": now_iso,
                            "billing_cycle_end": end_dt.isoformat(),
                            "billing_cycle_type": billing_cycle_type,
                            "grace_period_end": grace_dt.isoformat()
                        },
                        headers=supabase.admin_headers
                    )
                    
            return {
                "success": True,
                "status": "COMPLETED",
                "order_id": req.order_id,
                "details": checkout_data
            }

    # ── PayPal Order Capture Flow ──
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
            logger.warning(f"Failed to update PayPal transaction: {e}")
            
        if capture_status == "COMPLETED":
            try:
                async with httpx.AsyncClient(trust_env=False, timeout=30.0) as db_client:
                    is_parent = False
                    user_id = req.academy_id
                    plan_id = req.plan_id
                    billing_cycle_type = "monthly"
                    try:
                        custom_id = capture_data.get("purchase_units", [])[0].get("custom_id", "")
                        if custom_id.startswith("parent|"):
                            is_parent = True
                            user_id = custom_id.split("|")[1]
                        elif "|" in custom_id:
                            parts = custom_id.split("|")
                            user_id = parts[0]
                            plan_id = parts[1] if len(parts) > 1 else None
                            billing_cycle_type = parts[2] if len(parts) > 2 else "monthly"
                    except Exception:
                        pass
                        
                    if is_parent:
                        await db_client.patch(
                            f"{supabase.url}/rest/v1/users?id=eq.{user_id}",
                            json={"account_status": "Active"},
                            headers=supabase.admin_headers
                        )
                    else:
                        from datetime import timedelta
                        now = datetime.now(timezone.utc)
                        now_iso = now.isoformat()
                        
                        cycle_type = billing_cycle_type or "monthly"
                        if cycle_type == "yearly":
                            end_dt = now + timedelta(days=365)
                        else:
                            end_dt = now + timedelta(days=30)
                        grace_dt = end_dt + timedelta(days=7)
                        
                        update_data = {
                            "subscription_status": "active",
                            "status": "active",
                            "last_payment_at": now_iso,
                            "billing_cycle_start": now_iso,
                            "billing_cycle_end": end_dt.isoformat(),
                            "billing_cycle_type": cycle_type,
                            "grace_period_end": grace_dt.isoformat()
                        }
                        if plan_id:
                            update_data["plan_id"] = plan_id
                            
                        await db_client.patch(
                            f"{supabase.url}/rest/v1/academies?id=eq.{req.academy_id}",
                            json=update_data,
                            headers=supabase.admin_headers
                        )
            except Exception as e:
                logger.warning(f"Failed to update PayPal subscription status: {e}")
                
            try:
                payer_email = ""
                payer_name = ""
                amount_value = 0.0
                currency = "USD"
                try:
                    payer = capture_data.get("payer", {})
                    payer_email = payer.get("email_address", "") or ""
                    payer_name_obj = payer.get("name", {}) or {}
                    payer_name = (f"{payer_name_obj.get('given_name', '')} {payer_name_obj.get('surname', '')}").strip() or payer_email.split("@")[0]
                    units = capture_data.get("purchase_units") or []
                    if units:
                        captures = (units[0].get("payments") or {}).get("captures") or []
                        if captures:
                            amt = captures[0].get("amount") or {}
                            amount_value = float(amt.get("value") or 0)
                            currency = amt.get("currency_code") or currency
                except Exception as parse_err:
                    logger.warning(f"Failed to parse PayPal receipt payload: {parse_err}")
                    
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
                logger.warning(f"PayPal receipt email failed: {mail_err}")
                
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
                parts = custom_id.split("|")
                academy_id = parts[0]
                plan_id = parts[1] if len(parts) > 1 else None
                billing_cycle_type = parts[2] if len(parts) > 2 else "monthly"

                from datetime import datetime, timedelta, timezone
                now = datetime.now(timezone.utc)
                now_iso = now.isoformat()

                cycle_type = billing_cycle_type or "monthly"
                if cycle_type == "yearly":
                    end_dt = now + timedelta(days=365)
                else:
                    end_dt = now + timedelta(days=30)
                grace_dt = end_dt + timedelta(days=7)

                update_data = {
                    "subscription_status": "active",
                    "status": "active",
                    "last_payment_at": now_iso,
                    "billing_cycle_start": now_iso,
                    "billing_cycle_end": end_dt.isoformat(),
                    "billing_cycle_type": cycle_type,
                    "grace_period_end": grace_dt.isoformat()
                }
                if plan_id:
                    update_data["plan_id"] = plan_id

                await db.patch(
                    f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
                    json=update_data,
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


# ── Lemon Squeezy Webhook Signature Verification ──

async def verify_lemonsqueezy_webhook_signature(request: Request, raw_body: bytes) -> bool:
    """Verify Lemon Squeezy webhook signature using HMAC-SHA256."""
    _, signing_secret = await get_ls_credentials()
    if not signing_secret:
        logger.warning("LEMON_SQUEEZY_SIGNING_SECRET not set — skipping signature verification (set it in .env for production)")
        return True

    signature = request.headers.get("x-signature") or request.headers.get("X-Signature")
    if not signature:
        logger.warning("Lemon Squeezy webhook missing x-signature header — rejecting")
        return False

    try:
        import hmac
        import hashlib
        digest = hmac.new(
            signing_secret.encode("utf-8"),
            msg=raw_body,
            digestmod=hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(digest, signature)
    except Exception as e:
        logger.error(f"Error validating Lemon Squeezy signature: {e}")
        return False


# ── Lemon Squeezy Webhook (for subscription lifecycle) ──

@router.post("/lemonsqueezy/webhook")
async def lemonsqueezy_webhook(request: Request):
    """Handle Lemon Squeezy webhook events — verifies signature before processing."""
    raw_body = await request.body()

    if not await verify_lemonsqueezy_webhook_signature(request, raw_body):
        logger.warning("Rejected Lemon Squeezy webhook with invalid signature")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        import json
        body = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_name = body.get("meta", {}).get("event_name", "")
    custom_data = body.get("meta", {}).get("custom_data", {})

    if not custom_data:
        custom_data = body.get("data", {}).get("attributes", {}).get("custom", {})

    if not custom_data:
        logger.warning(f"Lemon Squeezy webhook event {event_name} missing custom metadata — ignoring")
        return {"status": "ignored", "reason": "missing_custom_data"}

    academy_id = custom_data.get("academy_id")
    plan_id = custom_data.get("plan_id", "pro")
    billing_cycle_type = custom_data.get("billing_cycle_type", "monthly")

    target_events = ["subscription_created", "subscription_payment_success", "order_created"]

    if event_name in target_events and academy_id:
        data_obj = body.get("data", {})
        resource_id = data_obj.get("id")
        attributes = data_obj.get("attributes", {})
        renews_at_str = attributes.get("renews_at")

        from datetime import datetime, timedelta, timezone
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        if renews_at_str:
            try:
                end_dt = datetime.fromisoformat(renews_at_str.replace("Z", "+00:00"))
            except Exception:
                cycle_days = 365 if billing_cycle_type == "yearly" else 30
                end_dt = now + timedelta(days=cycle_days)
        else:
            cycle_days = 365 if billing_cycle_type == "yearly" else 30
            end_dt = now + timedelta(days=cycle_days)

        grace_dt = end_dt + timedelta(days=7)

        try:
            async with httpx.AsyncClient(trust_env=False, timeout=20.0) as client:
                checkout_id = body.get("meta", {}).get("checkout_id") or resource_id
                tx_ref = f"lemonsqueezy_{checkout_id}"

                tx_check = await client.get(
                    f"{supabase.url}/rest/v1/payment_transactions?paypal_order_id=eq.{tx_ref}",
                    headers=supabase.admin_headers
                )

                txn_payload = {
                    "status": "completed",
                    "completed_at": now_iso,
                    "paypal_capture_id": str(resource_id)
                }

                if tx_check.status_code == 200 and tx_check.json():
                    await client.patch(
                        f"{supabase.url}/rest/v1/payment_transactions?paypal_order_id=eq.{tx_ref}",
                        json=txn_payload,
                        headers=supabase.admin_headers
                    )
                else:
                    await client.post(
                        f"{supabase.url}/rest/v1/payment_transactions",
                        json={
                            "paypal_order_id": tx_ref,
                            "academy_id": academy_id,
                            "plan_id": plan_id if is_valid_uuid(plan_id) else None,
                            "amount": float(attributes.get("total_usd") or attributes.get("total") or 0) / 100.0 or 499.0,
                            "currency": attributes.get("currency", "MAD"),
                            "status": "completed",
                            "created_at": now_iso,
                            "completed_at": now_iso,
                            "paypal_capture_id": str(resource_id),
                            "billing_cycle_type": billing_cycle_type
                        },
                        headers=supabase.admin_headers
                    )

                if academy_id and not academy_id.startswith("temp_") and not academy_id.startswith("pending_"):
                    await client.patch(
                        f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
                        json={
                            "subscription_status": "active",
                            "status": "active",
                            "plan_id": plan_id,
                            "last_payment_at": now_iso,
                            "billing_cycle_start": now_iso,
                            "billing_cycle_end": end_dt.isoformat(),
                            "billing_cycle_type": billing_cycle_type,
                            "grace_period_end": grace_dt.isoformat()
                        },
                        headers=supabase.admin_headers
                    )
                    logger.info(f"Lemon Squeezy subscription activated successfully for {academy_id} - {plan_id}")
        except Exception as e:
            logger.error(f"Error handling Lemon Squeezy webhook event {event_name}: {e}")
            raise HTTPException(status_code=500, detail="Internal processing error")

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


@router.get("/lemonsqueezy/config", dependencies=[])
async def get_lemonsqueezy_config():
    """Get current Lemon Squeezy configuration (keys masked for security)."""
    api_key, signing_secret = await get_ls_credentials()
    
    # Check if values come from DB
    db_values = {}
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=5.0) as client:
            res = await client.get(
                f"{supabase.url}/rest/v1/saas_settings?select=lemon_squeezy_api_key,lemon_squeezy_signing_secret&limit=1",
                headers=supabase.admin_headers
            )
            if res.status_code == 200 and res.json():
                row = res.json()[0]
                db_values = {
                    "api_key_in_db": bool(row.get("lemon_squeezy_api_key", "")),
                    "signing_in_db": bool(row.get("lemon_squeezy_signing_secret", "")),
                }
    except Exception:
        pass
    
    def mask(val: str | None) -> str:
        if not val:
            return ""
        return val[:8] + "..." + val[-4:] if len(val) > 12 else "***"
    
    return {
        "api_key_masked": mask(api_key),
        "signing_secret_masked": mask(signing_secret),
        "api_key_configured": bool(api_key),
        "signing_secret_configured": bool(signing_secret),
        "source": "database" if db_values.get("api_key_in_db") else "environment",
        **db_values,
    }


class LemonSqueezyConfigUpdate(BaseModel):
    lemon_squeezy_api_key: str | None = None
    lemon_squeezy_signing_secret: str | None = None


@router.put("/lemonsqueezy/config")
async def update_lemonsqueezy_config(data: LemonSqueezyConfigUpdate):
    """Save Lemon Squeezy API Key and Signing Secret to saas_settings DB.
    This overrides the .env values without redeploying the backend.
    Requires super_admin auth (handled by SaaS admin dashboard)."""
    patch = {}
    if data.lemon_squeezy_api_key is not None:
        patch["lemon_squeezy_api_key"] = data.lemon_squeezy_api_key.strip()
    if data.lemon_squeezy_signing_secret is not None:
        patch["lemon_squeezy_signing_secret"] = data.lemon_squeezy_signing_secret.strip()
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update.")
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            check = await client.get(
                f"{supabase.url}/rest/v1/saas_settings?select=id&limit=1",
                headers=supabase.admin_headers
            )
            existing = check.json() if check.status_code == 200 else []
            if existing:
                res = await client.patch(
                    f"{supabase.url}/rest/v1/saas_settings?id=eq.{existing[0]['id']}",
                    json=patch,
                    headers=supabase.admin_headers
                )
            else:
                res = await client.post(
                    f"{supabase.url}/rest/v1/saas_settings",
                    json=patch,
                    headers=supabase.admin_headers
                )
            if res.status_code >= 400:
                error_body = res.text
                # Columns may not exist yet — we'll return a helpful error
                if "column" in error_body.lower() or "does not exist" in error_body.lower():
                    raise HTTPException(
                        status_code=422,
                        detail="DB columns lemon_squeezy_api_key / lemon_squeezy_signing_secret do not exist yet. Run the migration SQL first."
                    )
                raise HTTPException(status_code=500, detail=f"DB error: {error_body[:200]}")
        return {"success": True, "message": "Lemon Squeezy credentials saved to database."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to save LS config: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lemonsqueezy/status", dependencies=[])
async def lemonsqueezy_status():
    """Verify Lemon Squeezy integration status, fetches stores and products dynamically."""
    api_key, signing_secret = await get_ls_credentials()
    
    if not api_key:
        return {
            "configured": False,
            "message": "Lemon Squeezy API Key is not set in backend environment variables.",
            "mode": "test"
        }
        
    headers = {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "Authorization": f"Bearer {api_key}"
    }
    
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=15.0) as client:
            # Fetch stores
            res = await client.get("https://api.lemonsqueezy.com/v1/stores", headers=headers)
            if res.status_code != 200:
                return {
                    "configured": False,
                    "message": f"Failed to authenticate with Lemon Squeezy: Status {res.status_code}",
                    "mode": "test"
                }
            
            stores_data = res.json().get("data", [])
            if not stores_data:
                return {
                    "configured": False,
                    "message": "Authenticated successfully, but no stores found on this account.",
                    "mode": "test"
                }
                
            first_store = stores_data[0]
            store_id = str(first_store["id"])
            store_name = first_store["attributes"]["name"]
            
            # Try to fetch products and variants
            products_res = await client.get("https://api.lemonsqueezy.com/v1/products", headers=headers)
            variants_list = []
            if products_res.status_code == 200:
                products_data = products_res.json().get("data", [])
                for p in products_data:
                    p_id = p["id"]
                    p_name = p["attributes"]["name"]
                    
                    # Fetch variants for this product
                    v_res = await client.get(f"https://api.lemonsqueezy.com/v1/variants?filter[product_id]={p_id}", headers=headers)
                    if v_res.status_code == 200:
                        v_data = v_res.json().get("data", [])
                        for v in v_data:
                            v_id = v["id"]
                            v_name = v["attributes"]["name"]
                            v_status = v["attributes"]["status"]
                            v_price = float(v["attributes"].get("price", 0)) / 100.0
                            variants_list.append({
                                "product_name": p_name,
                                "variant_name": v_name,
                                "variant_id": v_id,
                                "status": v_status,
                                "price": v_price
                            })
            
            # Fetch configured webhooks (handle gracefully if token scope is restricted)
            webhooks_res = await client.get("https://api.lemonsqueezy.com/v1/webhooks", headers=headers)
            webhooks_configured = []
            webhooks_scope_error = False
            if webhooks_res.status_code == 200:
                webhooks_data = webhooks_res.json().get("data", [])
                for w in webhooks_data:
                    url = w["attributes"]["url"]
                    status = w["attributes"]["status"]
                    events = w["attributes"]["events"]
                    webhooks_configured.append({
                        "id": w["id"],
                        "url": url,
                        "status": status,
                        "events": events
                    })
            else:
                webhooks_scope_error = True
                
            return {
                "configured": True,
                "store_name": store_name,
                "store_id": store_id,
                "mode": "sandbox" if (len(api_key) > 400 or "test" in api_key.lower()) else "live",
                "signing_secret_configured": bool(signing_secret),
                "variants": variants_list,
                "webhooks": webhooks_configured,
                "webhooks_scope_error": webhooks_scope_error,
                "webhook_target_url": "https://elghazali1987-academy-backend.hf.space/api/v1/payments/gateway/lemonsqueezy/webhook"
            }
            
    except Exception as e:
        logger.error(f"Error checking Lemon Squeezy status: {e}")
        return {
            "configured": False,
            "message": f"Connection error: {str(e)}",
            "mode": "test"
        }





# =========================================================
# MOROCCAN CASH DEPOSITS (Wafacash / CashPlus)
# =========================================================

class CashPaymentRequest(BaseModel):
    academy_id: str
    plan_id: str
    amount: float
    provider: str  # "wafacash" or "cashplus"
    billing_cycle_type: Optional[str] = "monthly"  # "monthly" or "yearly"

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
        "plan_id": req.plan_id if is_valid_uuid(req.plan_id) else None,
        "amount": req.amount,
        "currency": "MAD",
        "status": "waiting_deposit",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "paypal_capture_id": req.provider.upper(), # Store provider type in capture_id column
        "billing_cycle_type": req.billing_cycle_type or "monthly"
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
        billing_cycle_type = tx.get("billing_cycle_type", "monthly")
        
        from datetime import datetime, timedelta, timezone
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        
        cycle_type = billing_cycle_type or "monthly"
        if cycle_type == "yearly":
            end_dt = now + timedelta(days=365)
        else:
            end_dt = now + timedelta(days=30)
        grace_dt = end_dt + timedelta(days=7)

        # 2. Update transaction status
        await client.patch(
            f"{supabase.url}/rest/v1/payment_transactions?paypal_order_id=eq.{quote(req.transaction_id)}",
            json={
                "status": "completed",
                "completed_at": now_iso,
                "paypal_capture_id": f"{tx.get('paypal_capture_id', 'CASH')}|PROOF:{req.deposit_proof_reference}"
            },
            headers=supabase.admin_headers
        )
        
        # 3. Activate subscription
        await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json={
                "subscription_status": "active",
                "status": "active",
                "plan_id": plan_id,
                "last_payment_at": now_iso,
                "billing_cycle_start": now_iso,
                "billing_cycle_end": end_dt.isoformat(),
                "billing_cycle_type": cycle_type,
                "grace_period_end": grace_dt.isoformat()
            },
            headers=supabase.admin_headers
        )
        
    return {"success": True, "message": f"Cash deposit confirmed successfully for {academy_id}. Subscription activated!"}

import pytest
from httpx import Response
import hmac
import hashlib
import json
from core.config import settings

def test_lemonsqueezy_create_order_succeeds(client, respx_mock, monkeypatch):
    """SaaS plan checkout creation calls Lemon Squeezy API and returns checkout URL."""
    monkeypatch.setattr(settings, "LEMON_SQUEEZY_API_KEY", "test-api-key")
    
    # Mock stores API call
    respx_mock.get("https://api.lemonsqueezy.com/v1/stores").mock(
        return_value=Response(200, json={
            "data": [{"type": "stores", "id": "397704", "attributes": {"name": "Test Store"}}]
        })
    )
    
    # Mock checkouts API call (initial and retry)
    respx_mock.post("https://api.lemonsqueezy.com/v1/checkouts").mock(
        return_value=Response(201, json={
            "data": {
                "type": "checkouts",
                "id": "checkout-abc-123",
                "attributes": {
                    "url": "https://fcccasablanca.lemonsqueezy.com/checkout/buy/123"
                }
            }
        })
    )
    
    # Mock optional DB save
    respx_mock.post(url__regex=r".*/rest/v1/payment_transactions").mock(
        return_value=Response(201, json={})
    )

    res = client.post(
        "/api/v1/payments/gateway/create-order",
        json={
            "academy_id": "academy-uuid",
            "plan_id": "pro",
            "amount": 499.00,
            "currency": "MAD",
            "source": "saas_subscriptions"
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["order_id"] == "checkout-abc-123"
    assert body["status"] == "APPROVED"
    assert "approve_url" in body


def test_lemonsqueezy_webhook_rejects_invalid_signature(client, monkeypatch):
    """Lemon Squeezy Webhook with bad signature yields 401."""
    monkeypatch.setattr(settings, "LEMON_SQUEEZY_SIGNING_SECRET", "secret-key")
    
    res = client.post(
        "/api/v1/payments/gateway/lemonsqueezy/webhook",
        json={"meta": {"event_name": "subscription_created"}},
        headers={"x-signature": "bad-signature"}
    )
    assert res.status_code == 401


def test_lemonsqueezy_webhook_processes_subscription_created(client, respx_mock, monkeypatch):
    """Lemon Squeezy Webhook processes valid events and updates academies in Supabase."""
    monkeypatch.setattr(settings, "LEMON_SQUEEZY_SIGNING_SECRET", "secret-key")
    
    payload = {
        "meta": {
            "event_name": "subscription_created",
            "checkout_id": "checkout-123",
            "custom_data": {
                "academy_id": "real-academy-uuid",
                "plan_id": "pro",
                "billing_cycle_type": "monthly"
            }
        },
        "data": {
            "type": "subscriptions",
            "id": "sub-id-123",
            "attributes": {
                "store_id": 397704,
                "variant_id": 1748483,
                "status": "active",
                "total": 49900,
                "currency": "MAD",
                "renews_at": "2026-07-04T19:10:54.000000Z"
            }
        }
    }
    
    raw_body = json.dumps(payload).encode("utf-8")
    signature = hmac.new(b"secret-key", msg=raw_body, digestmod=hashlib.sha256).hexdigest()
    
    # Mock checking transaction
    respx_mock.get(url__regex=r".*/rest/v1/payment_transactions\?paypal_order_id=eq\.lemonsqueezy_checkout-123").mock(
        return_value=Response(200, json=[])
    )
    
    # Mock creating transaction
    respx_mock.post(url__regex=r".*/rest/v1/payment_transactions").mock(
        return_value=Response(201, json={})
    )
    
    # Mock updating academy subscription
    academy_mock = respx_mock.patch(url__regex=r".*/rest/v1/academies\?id=eq\.real-academy-uuid").mock(
        return_value=Response(200, json=[{}])
    )

    res = client.post(
        "/api/v1/payments/gateway/lemonsqueezy/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "x-signature": signature
        }
    )
    assert res.status_code == 200
    assert academy_mock.called


def test_lemonsqueezy_capture_order_verifies_successfully(client, respx_mock, monkeypatch):
    """Capture order verifies the checkout session directly via Lemon Squeezy API and activates academy."""
    monkeypatch.setattr(settings, "LEMON_SQUEEZY_API_KEY", "test-api-key")
    
    # Mock get checkout from Lemon Squeezy
    checkout_id = "e5784a2c-a4c2-4346-99e1-6c4544ca52c0"
    respx_mock.get(f"https://api.lemonsqueezy.com/v1/checkouts/{checkout_id}").mock(
        return_value=Response(200, json={
            "data": {
                "id": checkout_id,
                "attributes": {
                    "checkout_data": {
                        "custom": {
                            "academy_id": "real-academy-uuid",
                            "plan_id": "pro",
                            "billing_cycle_type": "monthly"
                        }
                    }
                }
            }
        })
    )
    
    # Mock check transaction
    respx_mock.get(url__regex=r".*/rest/v1/payment_transactions\?paypal_order_id=eq\.lemonsqueezy_.*").mock(
        return_value=Response(200, json=[])
    )
    
    # Mock create transaction
    respx_mock.post(url__regex=r".*/rest/v1/payment_transactions").mock(
        return_value=Response(201, json={})
    )
    
    # Mock academy update
    academy_mock = respx_mock.patch(url__regex=r".*/rest/v1/academies\?id=eq\.real-academy-uuid").mock(
        return_value=Response(200, json=[{}])
    )

    res = client.post(
        "/api/v1/payments/gateway/capture-order",
        json={
            "order_id": checkout_id,
            "academy_id": "real-academy-uuid",
            "plan_id": "pro"
        }
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["status"] == "COMPLETED"
    assert academy_mock.called

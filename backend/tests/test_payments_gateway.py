"""
Tests for /api/v1/payments/gateway/* — PayPal integration.

Critical paths:
- Validation on amount/currency/plan_id (block negative or absurd values)
- PayPal API failures handled gracefully
- Webhook signature MUST be verified before processing (security boundary)
- Status endpoint reports configuration correctly
"""
import pytest
from httpx import Response


# ─── /payments/gateway/status ──────────────────────────────────


def test_status_when_credentials_set(client):
    """Test env has PAYPAL_CLIENT_ID + SECRET set → configured=True."""
    res = client.get("/api/v1/payments/gateway/status")
    assert res.status_code == 200
    body = res.json()
    assert body["configured"] is True
    assert body["mode"] == "sandbox"
    assert "frontend_url" in body


def test_status_when_credentials_missing(client, monkeypatch):
    """Without credentials → configured=False."""
    from core.config import settings
    monkeypatch.setattr(settings, "PAYPAL_CLIENT_ID", None)
    monkeypatch.setattr(settings, "PAYPAL_CLIENT_SECRET", None)

    res = client.get("/api/v1/payments/gateway/status")
    body = res.json()
    assert body["configured"] is False


# ─── /payments/gateway/create-order — validation ──────────────


def test_create_order_rejects_negative_amount(client):
    res = client.post(
        "/api/v1/payments/gateway/create-order",
        json={"plan_id": "p1", "amount": -10.0, "currency": "USD"},
    )
    assert res.status_code == 422


def test_create_order_rejects_zero_amount(client):
    res = client.post(
        "/api/v1/payments/gateway/create-order",
        json={"plan_id": "p1", "amount": 0, "currency": "USD"},
    )
    assert res.status_code == 422


def test_create_order_rejects_huge_amount(client):
    """Cap at 100k to prevent abuse / mistake."""
    res = client.post(
        "/api/v1/payments/gateway/create-order",
        json={"plan_id": "p1", "amount": 999_999_999, "currency": "USD"},
    )
    assert res.status_code == 422


def test_create_order_rejects_invalid_currency(client):
    """Currency must be 3-letter uppercase."""
    res = client.post(
        "/api/v1/payments/gateway/create-order",
        json={"plan_id": "p1", "amount": 10.0, "currency": "usd"},
    )
    assert res.status_code == 422


def test_create_order_rejects_missing_plan_id(client):
    res = client.post(
        "/api/v1/payments/gateway/create-order",
        json={"amount": 10.0, "currency": "USD"},
    )
    assert res.status_code == 422


def test_create_order_rejects_empty_plan_id(client):
    res = client.post(
        "/api/v1/payments/gateway/create-order",
        json={"plan_id": "", "amount": 10.0, "currency": "USD"},
    )
    assert res.status_code == 422


# ─── /create-order — happy + failure paths ────────────────────


def test_create_order_succeeds(client, respx_mock):
    """Successful PayPal order creation returns approve_url."""
    # Mock PayPal OAuth token endpoint
    respx_mock.post(url__regex=r".*/v1/oauth2/token").mock(
        return_value=Response(200, json={"access_token": "fake-paypal-token"})
    )
    # Mock PayPal order creation
    respx_mock.post(url__regex=r".*/v2/checkout/orders").mock(
        return_value=Response(
            201,
            json={
                "id": "ORDER123",
                "status": "CREATED",
                "links": [
                    {"rel": "self", "href": "https://api/orders/ORDER123"},
                    {"rel": "approve", "href": "https://paypal.com/approve/ORDER123"},
                ],
            },
        )
    )
    # Mock the optional DB save (academy_id provided)
    respx_mock.post(url__regex=r".*/rest/v1/payment_transactions").mock(
        return_value=Response(201, json={})
    )

    res = client.post(
        "/api/v1/payments/gateway/create-order",
        json={
            "academy_id": "academy-1",
            "plan_id": "premium",
            "amount": 49.99,
            "currency": "USD",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["order_id"] == "ORDER123"
    assert body["status"] == "CREATED"
    assert body["approve_url"] == "https://paypal.com/approve/ORDER123"


def test_create_order_handles_paypal_auth_failure(client, respx_mock):
    """If PayPal auth fails → 502 Bad Gateway."""
    respx_mock.post(url__regex=r".*/v1/oauth2/token").mock(
        return_value=Response(401, json={"error": "invalid_client"})
    )

    res = client.post(
        "/api/v1/payments/gateway/create-order",
        json={"plan_id": "p1", "amount": 10.0, "currency": "USD"},
    )
    assert res.status_code == 502


def test_create_order_handles_paypal_order_failure(client, respx_mock):
    """If PayPal order creation fails → 502."""
    respx_mock.post(url__regex=r".*/v1/oauth2/token").mock(
        return_value=Response(200, json={"access_token": "tok"})
    )
    respx_mock.post(url__regex=r".*/v2/checkout/orders").mock(
        return_value=Response(500, text="PayPal internal error")
    )

    res = client.post(
        "/api/v1/payments/gateway/create-order",
        json={"plan_id": "p1", "amount": 10.0, "currency": "USD"},
    )
    assert res.status_code == 502


def test_create_order_no_credentials(client, respx_mock, monkeypatch):
    """No PayPal creds configured → 500 with clear message."""
    from core.config import settings
    monkeypatch.setattr(settings, "PAYPAL_CLIENT_ID", None)

    res = client.post(
        "/api/v1/payments/gateway/create-order",
        json={"plan_id": "p1", "amount": 10.0, "currency": "USD"},
    )
    assert res.status_code == 500
    assert "credentials" in res.json()["detail"].lower()


def test_create_order_works_without_academy_id(client, respx_mock):
    """Public landing page flow — no academy_id, uses temp UUID, skips DB save."""
    respx_mock.post(url__regex=r".*/v1/oauth2/token").mock(
        return_value=Response(200, json={"access_token": "tok"})
    )
    respx_mock.post(url__regex=r".*/v2/checkout/orders").mock(
        return_value=Response(
            201,
            json={
                "id": "PUBLIC_ORDER",
                "status": "CREATED",
                "links": [{"rel": "approve", "href": "https://paypal.com/x"}],
            },
        )
    )

    res = client.post(
        "/api/v1/payments/gateway/create-order",
        json={"plan_id": "p1", "amount": 10.0, "currency": "USD", "source": "saas_landing"},
    )
    assert res.status_code == 200
    assert res.json()["order_id"] == "PUBLIC_ORDER"


# ─── /payments/gateway/webhook — security ─────────────────────


def test_webhook_rejects_invalid_signature(client, mocker, respx_mock):
    """Forged webhook (invalid signature) → 401."""
    mocker.patch(
        "routers.payments_gateway.verify_paypal_webhook_signature",
        return_value=False,
    )

    res = client.post(
        "/api/v1/payments/gateway/webhook",
        json={"event_type": "PAYMENT.CAPTURE.COMPLETED", "resource": {"custom_id": "x|y"}},
    )
    assert res.status_code == 401


def test_webhook_rejects_invalid_json(client, mocker):
    """Even with valid sig, bad JSON body → 400."""
    mocker.patch(
        "routers.payments_gateway.verify_paypal_webhook_signature",
        return_value=True,
    )
    res = client.post(
        "/api/v1/payments/gateway/webhook",
        content=b"not-json",
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 400


def test_webhook_processes_capture_completed(client, mocker, respx_mock):
    """Valid signature + PAYMENT.CAPTURE.COMPLETED → updates academy subscription."""
    mocker.patch(
        "routers.payments_gateway.verify_paypal_webhook_signature",
        return_value=True,
    )
    # Mock the academy update
    update_route = respx_mock.patch(url__regex=r".*/rest/v1/academies\?id=eq\.academy-99.*").mock(
        return_value=Response(200, json=[{}])
    )

    res = client.post(
        "/api/v1/payments/gateway/webhook",
        json={
            "event_type": "PAYMENT.CAPTURE.COMPLETED",
            "resource": {"custom_id": "academy-99|premium"},
        },
    )
    assert res.status_code == 200
    assert update_route.called


def test_webhook_ignores_other_events(client, mocker, respx_mock):
    """Webhook for non-capture events should still 200 but not modify DB."""
    mocker.patch(
        "routers.payments_gateway.verify_paypal_webhook_signature",
        return_value=True,
    )

    res = client.post(
        "/api/v1/payments/gateway/webhook",
        json={"event_type": "BILLING.SUBSCRIPTION.CREATED", "resource": {}},
    )
    assert res.status_code == 200


@pytest.mark.security
def test_webhook_missing_signature_headers_rejected(client, monkeypatch, respx_mock):
    """When PAYPAL_WEBHOOK_ID is set but headers are missing → reject."""
    from core.config import settings
    monkeypatch.setattr(settings, "PAYPAL_WEBHOOK_ID", "WH-TEST-ID")
    # No need to mock verify endpoint — request should fail before reaching it
    res = client.post(
        "/api/v1/payments/gateway/webhook",
        json={"event_type": "PAYMENT.CAPTURE.COMPLETED"},
        # no PAYPAL-* headers
    )
    assert res.status_code == 401

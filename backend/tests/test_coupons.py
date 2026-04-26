"""
Tests for /api/v1/coupons/* — coupon CRUD + validation.

Coupons drive discounts on subscription pricing — bad validation here means:
- Wrong format codes can break payment matching
- Inactive coupons that still apply discounts = revenue leak
- Missing auth = anyone can create / delete coupons
"""
import pytest


# ─── Authentication required ──────────────────────────────────


def test_unauthenticated_list_blocked(client):
    res = client.get("/api/v1/coupons/")
    assert res.status_code == 401


def test_unauthenticated_create_blocked(client):
    res = client.post("/api/v1/coupons/", json={
        "code": "SUMMER25",
        "discount_type": "percentage",
        "discount_value": 25,
    })
    assert res.status_code == 401


# ─── Validation rules ─────────────────────────────────────────


def test_create_rejects_lowercase_code(admin_client):
    """Coupon codes must be uppercase A-Z 0-9 _ -."""
    res = admin_client.post("/api/v1/coupons/", json={
        "code": "summer25",
        "discount_type": "percentage",
        "discount_value": 25,
    })
    assert res.status_code == 422


def test_create_rejects_special_chars(admin_client):
    res = admin_client.post("/api/v1/coupons/", json={
        "code": "SUMMER@25",
        "discount_type": "percentage",
        "discount_value": 25,
    })
    assert res.status_code == 422


def test_create_rejects_too_short_code(admin_client):
    res = admin_client.post("/api/v1/coupons/", json={
        "code": "AB",
        "discount_type": "percentage",
        "discount_value": 25,
    })
    assert res.status_code == 422


def test_create_rejects_too_long_code(admin_client):
    res = admin_client.post("/api/v1/coupons/", json={
        "code": "A" * 51,
        "discount_type": "percentage",
        "discount_value": 25,
    })
    assert res.status_code == 422


def test_create_rejects_invalid_discount_type(admin_client):
    res = admin_client.post("/api/v1/coupons/", json={
        "code": "VALIDCODE",
        "discount_type": "free",  # not in Literal
        "discount_value": 25,
    })
    assert res.status_code == 422


def test_create_rejects_zero_discount(admin_client):
    """gt=0 — zero discount is meaningless."""
    res = admin_client.post("/api/v1/coupons/", json={
        "code": "FREE25",
        "discount_type": "percentage",
        "discount_value": 0,
    })
    assert res.status_code == 422


def test_create_rejects_negative_discount(admin_client):
    res = admin_client.post("/api/v1/coupons/", json={
        "code": "BUG",
        "discount_type": "percentage",
        "discount_value": -10,
    })
    assert res.status_code == 422


def test_create_accepts_valid_payload(admin_client, mocker):
    """Happy path: valid coupon → 200."""
    async def fake_insert(payload):
        return [{
            "id": "coupon-uuid",
            "code": payload["code"],
            "discount_type": payload["discount_type"],
            "discount_value": payload["discount_value"],
            "is_active": payload["is_active"],
            "created_at": "2026-04-26T10:00:00Z",
        }]

    mocker.patch("services.supabase_client.supabase.insert_coupon", side_effect=fake_insert)

    res = admin_client.post("/api/v1/coupons/", json={
        "code": "SUMMER_25",
        "discount_type": "percentage",
        "discount_value": 25,
        "is_active": True,
    })
    assert res.status_code == 200
    body = res.json()
    assert body["code"] == "SUMMER_25"
    assert body["discount_value"] == 25


# ─── Validate (public-ish) endpoint ───────────────────────────


def test_validate_returns_active_coupon(admin_client, mocker):
    async def fake_get(code):
        return {
            "id": "id-1",
            "code": code,
            "discount_type": "percentage",
            "discount_value": 20,
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z",
        }

    mocker.patch("services.supabase_client.supabase.get_coupon_by_code", side_effect=fake_get)

    res = admin_client.get("/api/v1/coupons/validate/EARLYBIRD")
    assert res.status_code == 200
    assert res.json()["is_active"] is True


def test_validate_rejects_inactive_coupon(admin_client, mocker):
    """Inactive coupons must NOT validate — prevents revenue leak."""
    async def fake_get(code):
        return {
            "id": "id-1",
            "code": code,
            "discount_type": "percentage",
            "discount_value": 20,
            "is_active": False,  # inactive
            "created_at": "2026-01-01T00:00:00Z",
        }

    mocker.patch("services.supabase_client.supabase.get_coupon_by_code", side_effect=fake_get)

    res = admin_client.get("/api/v1/coupons/validate/EXPIRED")
    assert res.status_code == 404


def test_validate_unknown_code_returns_404(admin_client, mocker):
    async def fake_get(code):
        return None

    mocker.patch("services.supabase_client.supabase.get_coupon_by_code", side_effect=fake_get)

    res = admin_client.get("/api/v1/coupons/validate/NOSUCH")
    assert res.status_code == 404


# ─── Toggle / Delete ─────────────────────────────────────────


def test_toggle_coupon_status(admin_client, mocker):
    async def fake_update(coupon_id, is_active):
        return [{
            "id": coupon_id,
            "code": "TESTCODE",
            "discount_type": "percentage",
            "discount_value": 10,
            "is_active": is_active,
            "created_at": "2026-01-01T00:00:00Z",
        }]

    mocker.patch("services.supabase_client.supabase.update_coupon_status", side_effect=fake_update)

    res = admin_client.patch("/api/v1/coupons/abc-123/toggle?is_active=false")
    assert res.status_code == 200
    assert res.json()["is_active"] is False


def test_toggle_requires_is_active_query_param(admin_client):
    """Without ?is_active=... → 422."""
    res = admin_client.patch("/api/v1/coupons/abc-123/toggle")
    assert res.status_code == 422


def test_delete_coupon(admin_client, mocker):
    async def fake_delete(coupon_id):
        return None

    mocker.patch("services.supabase_client.supabase.delete_coupon", side_effect=fake_delete)

    res = admin_client.delete("/api/v1/coupons/abc-123")
    assert res.status_code == 200
    assert res.json()["success"] is True


# ─── List ────────────────────────────────────────────────────


def test_list_coupons(admin_client, mocker):
    async def fake_list():
        return [
            {
                "id": "1", "code": "AAA", "discount_type": "percentage",
                "discount_value": 10, "is_active": True, "created_at": "2026-01-01T00:00:00Z",
            },
            {
                "id": "2", "code": "BBB", "discount_type": "fixed",
                "discount_value": 50, "is_active": False, "created_at": "2026-02-01T00:00:00Z",
            },
        ]

    mocker.patch("services.supabase_client.supabase.get_coupons", side_effect=fake_list)

    res = admin_client.get("/api/v1/coupons/")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 2
    assert body[0]["code"] == "AAA"

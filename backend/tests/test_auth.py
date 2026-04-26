"""
Tests for /auth/* endpoints.

Covers:
- Login: validation, bad credentials, success path
- Register: weak password, success
- OTP: send, verify, expiry, attempt limit
- Rate limiting: login lockout after 5 attempts
- 2FA: pending session expiry
"""
import time
import pytest
from httpx import Response


# ─── /auth/login validation ───────────────────────────────────


def test_login_invalid_email_format(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "not-an-email", "password": "whatever"},
    )
    assert res.status_code == 422


def test_login_empty_password(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "   "},
    )
    assert res.status_code == 422


def test_login_missing_fields(client):
    res = client.post("/api/v1/auth/login", json={"email": "test@example.com"})
    assert res.status_code == 422


# ─── /auth/login bad credentials ──────────────────────────────


def test_login_wrong_credentials_returns_401(client, mocker):
    """Supabase rejects → endpoint masks as 401."""
    async def boom(*args, **kwargs):
        raise Exception("Invalid login credentials")

    mocker.patch("services.supabase_client.supabase.sign_in_with_password", side_effect=boom)

    res = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "wrongpass"},
    )
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


# ─── /auth/login success path ─────────────────────────────────


def test_login_success_sets_cookies(client, mocker, respx_mock):
    """Successful login sets access_token, refresh_token, csrf_token cookies."""
    async def fake_signin(email, password):
        return {
            "user": {"id": "user-123", "email": email, "user_metadata": {"role": "parent"}},
            "access_token": "fake-jwt",
            "refresh_token": "fake-refresh",
        }

    mocker.patch("services.supabase_client.supabase.sign_in_with_password", side_effect=fake_signin)

    # Mock DB role lookup → returns parent
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\.user-123.*").mock(
        return_value=Response(200, json=[{"role": "parent"}])
    )
    # Mock account_status check
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\.user-123&select=account_status").mock(
        return_value=Response(200, json=[{"account_status": "Active"}])
    )

    res = client.post(
        "/api/v1/auth/login",
        json={"email": "parent@test.com", "password": "validpass"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["user_id"] == "user-123"
    assert body["role"] == "parent"
    assert body["access_token"] == "fake-jwt"
    # Cookies set
    cookies = res.cookies
    assert "access_token" in cookies
    assert "csrf_token" in cookies


def test_login_blocks_pending_parent(client, mocker, respx_mock):
    """Parent with account_status=Pending should be blocked with 403."""
    async def fake_signin(email, password):
        return {
            "user": {"id": "pending-user", "email": email, "user_metadata": {"role": "parent"}},
            "access_token": "fake-jwt",
            "refresh_token": "fake-refresh",
        }

    mocker.patch("services.supabase_client.supabase.sign_in_with_password", side_effect=fake_signin)

    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\.pending-user&select=role").mock(
        return_value=Response(200, json=[{"role": "parent"}])
    )
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\.pending-user&select=account_status").mock(
        return_value=Response(200, json=[{"account_status": "Pending"}])
    )

    res = client.post(
        "/api/v1/auth/login",
        json={"email": "pending@test.com", "password": "validpass"},
    )
    assert res.status_code == 403


# ─── /auth/logout ──────────────────────────────────────────────


def test_logout_clears_cookies(client):
    res = client.post("/api/v1/auth/logout")
    assert res.status_code == 200
    # Set-Cookie headers should clear the auth cookies
    set_cookie_headers = res.headers.get_list("set-cookie")
    cookie_str = " ".join(set_cookie_headers)
    assert "access_token=" in cookie_str
    assert "refresh_token=" in cookie_str


# ─── /auth/register validation ────────────────────────────────


def test_register_weak_password_rejected(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "new@test.com", "password": "short", "role": "parent"},
    )
    assert res.status_code == 422


def test_register_invalid_role_rejected(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "new@test.com", "password": "validpass123", "role": "hacker"},
    )
    assert res.status_code == 422


def test_register_strips_html_from_name(client, mocker):
    captured = {}

    async def fake_signup(email, password, data=None):
        captured["data"] = data
        return {"user": {"id": "new-user-id"}}

    mocker.patch("services.supabase_client.supabase.sign_up", side_effect=fake_signup)

    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new@test.com",
            "password": "validpass123",
            "role": "parent",
            "full_name": "<script>alert('xss')</script>Ahmed",
        },
    )
    assert res.status_code == 200
    # HTML tags must be stripped before reaching Supabase
    assert "<script>" not in captured["data"]["full_name"]
    assert "Ahmed" in captured["data"]["full_name"]


def test_register_failure_returns_400(client, mocker):
    async def boom(*args, **kwargs):
        raise Exception("Email already registered")

    mocker.patch("services.supabase_client.supabase.sign_up", side_effect=boom)

    res = client.post(
        "/api/v1/auth/register",
        json={"email": "exists@test.com", "password": "validpass123", "role": "parent"},
    )
    assert res.status_code == 400


# ─── OTP flow ──────────────────────────────────────────────────


def test_send_otp_creates_entry(client, mocker):
    mocker.patch("routers.auth.send_otp_email", return_value=True)

    res = client.post(
        "/api/v1/auth/send-otp",
        json={"email": "user@test.com", "purpose": "verify"},
    )
    assert res.status_code == 200

    # Verify OTP was actually stored
    from routers.auth import _otp_store
    assert "user@test.com" in _otp_store
    entry = _otp_store["user@test.com"]
    assert len(entry["code"]) == 6
    assert entry["purpose"] == "verify"


def test_send_otp_rate_limited_60s(client, mocker):
    """Same email cannot request a new OTP within 60s."""
    mocker.patch("routers.auth.send_otp_email", return_value=True)

    payload = {"email": "spam@test.com", "purpose": "verify"}
    res1 = client.post("/api/v1/auth/send-otp", json=payload)
    assert res1.status_code == 200

    res2 = client.post("/api/v1/auth/send-otp", json=payload)
    assert res2.status_code == 429


def test_verify_otp_wrong_code(client, mocker):
    mocker.patch("routers.auth.send_otp_email", return_value=True)
    client.post("/api/v1/auth/send-otp", json={"email": "u@test.com", "purpose": "verify"})

    res = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "u@test.com", "code": "000000"},
    )
    assert res.status_code == 400


def test_verify_otp_correct_code(client, mocker):
    mocker.patch("routers.auth.send_otp_email", return_value=True)
    client.post("/api/v1/auth/send-otp", json={"email": "u@test.com", "purpose": "verify"})

    from routers.auth import _otp_store
    real_code = _otp_store["u@test.com"]["code"]

    res = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "u@test.com", "code": real_code},
    )
    assert res.status_code == 200
    assert res.json()["verified"] is True
    # Code should be consumed
    assert "u@test.com" not in _otp_store


def test_verify_otp_no_code_present(client):
    res = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "nobody@test.com", "code": "123456"},
    )
    assert res.status_code == 400


def test_verify_otp_expired(client, mocker):
    mocker.patch("routers.auth.send_otp_email", return_value=True)
    client.post("/api/v1/auth/send-otp", json={"email": "u@test.com", "purpose": "verify"})

    # Force expiry
    from routers.auth import _otp_store
    _otp_store["u@test.com"]["expires"] = time.time() - 1

    res = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "u@test.com", "code": _otp_store["u@test.com"]["code"]},
    )
    assert res.status_code == 400


def test_verify_otp_locks_after_5_attempts(client, mocker):
    mocker.patch("routers.auth.send_otp_email", return_value=True)
    client.post("/api/v1/auth/send-otp", json={"email": "u@test.com", "purpose": "verify"})

    # 5 wrong attempts → still 400, 6th → 429 lockout
    for _ in range(5):
        client.post("/api/v1/auth/verify-otp", json={"email": "u@test.com", "code": "000000"})

    res = client.post("/api/v1/auth/verify-otp", json={"email": "u@test.com", "code": "000000"})
    assert res.status_code == 429


# ─── Rate limiting ────────────────────────────────────────────


@pytest.mark.security
def test_login_rate_limit_after_5_attempts(client, mocker):
    """6th login attempt from same IP within 15 min → 429."""
    async def boom(*args, **kwargs):
        raise Exception("Bad credentials")

    mocker.patch("services.supabase_client.supabase.sign_in_with_password", side_effect=boom)

    payload = {"email": "victim@test.com", "password": "wrong"}
    statuses = []
    for _ in range(6):
        r = client.post("/api/v1/auth/login", json=payload)
        statuses.append(r.status_code)

    # First 5 → 401, 6th → 429
    assert statuses[:5] == [401] * 5
    assert statuses[5] == 429


# ─── 2FA session expiry ───────────────────────────────────────


def test_2fa_verify_expired_session(client):
    res = client.post(
        "/api/v1/auth/2fa/verify",
        json={"temp_token": "does-not-exist", "code": "123456"},
    )
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower() or "session" in res.json()["detail"].lower()


def test_2fa_verify_temp_token_expired(client):
    """Pending 2FA session past its expiry should fail."""
    from routers.auth import _pending_2fa
    _pending_2fa["expired-token"] = {
        "user_id": "u1",
        "role": "admin",
        "token": "t",
        "refresh_token": "r",
        "expires": time.time() - 10,
    }
    res = client.post(
        "/api/v1/auth/2fa/verify",
        json={"temp_token": "expired-token", "code": "123456"},
    )
    assert res.status_code == 400

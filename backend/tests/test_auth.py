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


# ─── /auth/refresh ────────────────────────────────────────────


def test_refresh_no_token_returns_401(client):
    res = client.post("/api/v1/auth/refresh")
    assert res.status_code == 401
    assert "refresh token" in res.json()["detail"].lower() or "login" in res.json()["detail"].lower()


def test_refresh_from_body_succeeds(client, respx_mock):
    from core.config import settings
    respx_mock.post(f"{settings.SUPABASE_URL}/auth/v1/token").respond(200, json={
        "access_token": "new-access",
        "refresh_token": "new-refresh",
    })

    res = client.post("/api/v1/auth/refresh", json={"refresh_token": "old-refresh"})
    assert res.status_code == 200
    assert res.json()["refreshed"] is True
    assert res.json()["access_token"] == "new-access"


def test_refresh_expired_token_returns_401(client, respx_mock):
    from core.config import settings
    respx_mock.post(f"{settings.SUPABASE_URL}/auth/v1/token").respond(401, json={"error": "invalid"})

    res = client.post("/api/v1/auth/refresh", json={"refresh_token": "dead-refresh"})
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower() or "login" in res.json()["detail"].lower()


# ─── /auth/2fa/status ─────────────────────────────────────────


def test_2fa_status_returns_false_by_default(admin_client, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\..*select=totp_enabled").respond(
        200, json=[{"totp_enabled": False}]
    )

    res = admin_client.get("/api/v1/auth/2fa/status")
    assert res.status_code == 200
    assert res.json()["totp_enabled"] is False


def test_2fa_status_returns_true_when_enabled(admin_client, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\..*select=totp_enabled").respond(
        200, json=[{"totp_enabled": True}]
    )

    res = admin_client.get("/api/v1/auth/2fa/status")
    assert res.status_code == 200
    assert res.json()["totp_enabled"] is True


def test_2fa_status_returns_false_on_error(admin_client, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\..*select=totp_enabled").respond(500)

    res = admin_client.get("/api/v1/auth/2fa/status")
    assert res.status_code == 200
    assert res.json()["totp_enabled"] is False


# ─── /auth/2fa/setup ──────────────────────────────────────────


def test_2fa_setup_returns_secret_and_qr(admin_client, mocker):
    mocker.patch("routers.auth.generate_totp_secret", return_value="TESTSECRET")
    mocker.patch("routers.auth.get_totp_uri", return_value="otpauth://test")
    mocker.patch("routers.auth.generate_qr_base64", return_value="base64-qr-data")

    res = admin_client.post("/api/v1/auth/2fa/setup")
    assert res.status_code == 200
    assert res.json()["secret"] == "TESTSECRET"
    assert res.json()["qr_code"] == "base64-qr-data"


def test_2fa_setup_requires_auth(client):
    res = client.post("/api/v1/auth/2fa/setup")
    assert res.status_code == 401


# ─── /auth/2fa/enable ─────────────────────────────────────────


def test_2fa_enable_no_pending_setup(admin_client):
    from routers.auth import _pending_totp_setup
    _pending_totp_setup.clear()

    res = admin_client.post("/api/v1/auth/2fa/enable", json={"code": "123456"})
    assert res.status_code == 400
    assert "pending" in res.json()["detail"].lower() or "start over" in res.json()["detail"].lower()


def test_2fa_enable_invalid_code(admin_client, mocker):
    from routers.auth import _pending_totp_setup
    _pending_totp_setup["test-user-id"] = "TESTSECRET"
    mocker.patch("routers.auth.verify_totp_code", return_value=False)

    res = admin_client.post("/api/v1/auth/2fa/enable", json={"code": "000000"})
    assert res.status_code == 400


def test_2fa_enable_success(admin_client, mocker, respx_mock):
    from routers.auth import _pending_totp_setup
    from core.config import settings
    _pending_totp_setup["test-user-id"] = "REALSECRET"
    mocker.patch("routers.auth.verify_totp_code", return_value=True)
    respx_mock.patch(url__regex=r".*/rest/v1/users\?id=eq\.test-user-id").respond(204)

    res = admin_client.post("/api/v1/auth/2fa/enable", json={"code": "123456"})
    assert res.status_code == 200
    assert "enabled" in res.json()["message"].lower()
    assert "test-user-id" not in _pending_totp_setup


# ─── /auth/2fa/disable ────────────────────────────────────────


def test_2fa_disable_not_enabled(admin_client, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\..*totp").respond(
        200, json=[{"totp_enabled": False, "totp_secret": None}]
    )

    res = admin_client.post("/api/v1/auth/2fa/disable", json={"code": "123456"})
    assert res.status_code == 400
    assert "not enabled" in res.json()["detail"].lower()


def test_2fa_disable_invalid_code(admin_client, mocker, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\..*totp").respond(
        200, json=[{"totp_enabled": True, "totp_secret": "SECRET"}]
    )
    mocker.patch("routers.auth.verify_totp_code", return_value=False)

    res = admin_client.post("/api/v1/auth/2fa/disable", json={"code": "000000"})
    assert res.status_code == 400


def test_2fa_disable_success(admin_client, mocker, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\..*totp").respond(
        200, json=[{"totp_enabled": True, "totp_secret": "SECRET"}]
    )
    respx_mock.patch(url__regex=r".*/rest/v1/users\?id=eq\.test-user-id").respond(204)
    mocker.patch("routers.auth.verify_totp_code", return_value=True)

    res = admin_client.post("/api/v1/auth/2fa/disable", json={"code": "123456"})
    assert res.status_code == 200
    assert "disabled" in res.json()["message"].lower()


# ─── /auth/role ────────────────────────────────────────────────


def test_role_returns_admin_when_in_admins_table(admin_client, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/admins\?user_id=eq\..*").respond(
        200, json=[{"user_id": "test-user-id"}]
    )

    res = admin_client.get("/api/v1/auth/role")
    assert res.status_code == 200
    assert res.json()["role"] == "admin"


def test_role_returns_coach_when_in_coaches_table(admin_client, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/admins\?user_id=eq\..*").respond(200, json=[])
    respx_mock.get(url__regex=r".*/rest/v1/coaches\?user_id=eq\..*").respond(
        200, json=[{"user_id": "test-user-id"}]
    )

    res = admin_client.get("/api/v1/auth/role")
    assert res.status_code == 200
    assert res.json()["role"] == "coach"


def test_role_returns_parent_as_fallback(admin_client, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/admins\?user_id=eq\..*").respond(200, json=[])
    respx_mock.get(url__regex=r".*/rest/v1/coaches\?user_id=eq\..*").respond(200, json=[])
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\..*select=role").respond(
        200, json=[{"role": "parent"}]
    )

    res = admin_client.get("/api/v1/auth/role")
    assert res.status_code == 200
    assert res.json()["role"] == "parent"


# ─── /auth/reset-password ────────────────────────────────────


def test_reset_password_no_otp_stored(client):
    res = client.post("/api/v1/auth/reset-password", json={
        "email": "nocode@test.com", "code": "123456", "new_password": "newpass123"
    })
    assert res.status_code == 400


def test_reset_password_wrong_purpose(client, mocker):
    mocker.patch("routers.auth.send_otp_email", return_value=True)
    # Send OTP for "verify" purpose, not "reset"
    client.post("/api/v1/auth/send-otp", json={"email": "u@test.com", "purpose": "verify"})

    from routers.auth import _otp_store
    code = _otp_store["u@test.com"]["code"]

    res = client.post("/api/v1/auth/reset-password", json={
        "email": "u@test.com", "code": code, "new_password": "newpass123"
    })
    assert res.status_code == 400


def test_reset_password_wrong_code(client, mocker):
    mocker.patch("routers.auth.send_otp_email", return_value=True)
    client.post("/api/v1/auth/send-otp", json={"email": "reset@test.com", "purpose": "reset"})

    res = client.post("/api/v1/auth/reset-password", json={
        "email": "reset@test.com", "code": "000000", "new_password": "newpass123"
    })
    assert res.status_code == 400


def test_reset_password_too_short_password(client, mocker):
    mocker.patch("routers.auth.send_otp_email", return_value=True)
    client.post("/api/v1/auth/send-otp", json={"email": "reset@test.com", "purpose": "reset"})

    from routers.auth import _otp_store
    code = _otp_store["reset@test.com"]["code"]

    res = client.post("/api/v1/auth/reset-password", json={
        "email": "reset@test.com", "code": code, "new_password": "short"
    })
    assert res.status_code == 400


def test_reset_password_success(client, mocker, respx_mock):
    from core.config import settings
    mocker.patch("routers.auth.send_otp_email", return_value=True)
    client.post("/api/v1/auth/send-otp", json={"email": "reset@test.com", "purpose": "reset"})

    from routers.auth import _otp_store
    code = _otp_store["reset@test.com"]["code"]

    # Mock admin users list
    respx_mock.get(url__regex=r".*/auth/v1/admin/users.*").respond(200, json={
        "users": [{"id": "user-reset", "email": "reset@test.com"}]
    })
    respx_mock.get(url__regex=r".*/rest/v1/users\?select=id.*").respond(200, json=[])
    respx_mock.put(url__regex=r".*/auth/v1/admin/users/user-reset").respond(200, json={})

    res = client.post("/api/v1/auth/reset-password", json={
        "email": "reset@test.com", "code": code, "new_password": "newpass123"
    })
    assert res.status_code == 200
    assert "updated" in res.json()["message"].lower()


# ─── /auth/change-password ────────────────────────────────────


def test_change_password_too_short(admin_client):
    res = admin_client.post("/api/v1/auth/change-password", json={
        "current_password": "oldpass123", "new_password": "short"
    })
    assert res.status_code == 400
    assert "8 characters" in res.json()["detail"]


def test_change_password_same_as_current(admin_client):
    res = admin_client.post("/api/v1/auth/change-password", json={
        "current_password": "samepass123", "new_password": "samepass123"
    })
    assert res.status_code == 400
    assert "differ" in res.json()["detail"].lower()


def test_change_password_wrong_current(admin_client, respx_mock):
    from core.config import settings
    respx_mock.post(f"{settings.SUPABASE_URL}/auth/v1/token").respond(401)

    res = admin_client.post("/api/v1/auth/change-password", json={
        "current_password": "wrongold", "new_password": "newpass123"
    })
    assert res.status_code == 400
    assert "incorrect" in res.json()["detail"].lower()


def test_change_password_success(admin_client, respx_mock):
    from core.config import settings
    respx_mock.post(f"{settings.SUPABASE_URL}/auth/v1/token").respond(200, json={})
    respx_mock.put(url__regex=r".*/auth/v1/admin/users/.*").respond(200, json={})

    res = admin_client.post("/api/v1/auth/change-password", json={
        "current_password": "oldpass123", "new_password": "newpass123"
    })
    assert res.status_code == 200
    assert "updated" in res.json()["message"].lower()
    # Cookies should be cleared
    cookie_str = " ".join(res.headers.get_list("set-cookie"))
    assert "access_token=" in cookie_str


def test_change_password_requires_auth(client):
    res = client.post("/api/v1/auth/change-password", json={
        "current_password": "old", "new_password": "newpass123"
    })
    assert res.status_code == 401


# ─── /auth/parent-signup ──────────────────────────────────────


def test_parent_signup_weak_password(client):
    res = client.post("/api/v1/auth/parent-signup", json={
        "email": "parent@test.com", "password": "short", "full_name": "Test Parent"
    })
    assert res.status_code == 400
    assert "8 characters" in res.json()["detail"]


def test_parent_signup_success(client, mocker, respx_mock):
    from core.config import settings
    async def fake_signup(email, password, data=None):
        return {"user": {"id": "new-parent-id"}}

    mocker.patch("services.supabase_client.supabase.sign_up", side_effect=fake_signup)
    respx_mock.post(f"{settings.SUPABASE_URL}/rest/v1/users").respond(201, json={})

    res = client.post("/api/v1/auth/parent-signup", json={
        "email": "parent@test.com", "password": "validpass123",
        "full_name": "Hassan", "phone": "+212612345678"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "Pending"
    assert res.json()["user_id"] == "new-parent-id"


def test_parent_signup_with_child_name(client, mocker, respx_mock):
    from core.config import settings
    async def fake_signup(email, password, data=None):
        return {"user": {"id": "parent-child-id"}}

    mocker.patch("services.supabase_client.supabase.sign_up", side_effect=fake_signup)
    respx_mock.post(f"{settings.SUPABASE_URL}/rest/v1/users").respond(201, json={})
    mock_child = respx_mock.post(f"{settings.SUPABASE_URL}/rest/v1/parent_signup_requests").respond(201, json={})

    res = client.post("/api/v1/auth/parent-signup", json={
        "email": "p2@test.com", "password": "validpass123",
        "full_name": "Fatima", "child_name": "Youssef", "academy_id": "acad-1"
    })
    assert res.status_code == 200
    assert mock_child.called


def test_parent_signup_failure(client, mocker):
    async def boom(*args, **kwargs):
        raise Exception("general failure")

    mocker.patch("services.supabase_client.supabase.sign_up", side_effect=boom)

    res = client.post("/api/v1/auth/parent-signup", json={
        "email": "fail@test.com", "password": "validpass123", "full_name": "Fail"
    })
    assert res.status_code == 500


# ─── /auth/pending-parents ────────────────────────────────────


def test_pending_parents_requires_admin_role(admin_client, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\..*select=role,academy_id").respond(
        200, json=[{"role": "admin", "academy_id": "acad-1"}]
    )
    respx_mock.get(url__regex=r".*/rest/v1/users\?role=eq\.parent.*Pending").respond(
        200, json=[{"id": "pending-1", "email": "p@t.com", "full_name": "P"}]
    )

    res = admin_client.get("/api/v1/auth/pending-parents")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_pending_parents_rejects_non_admin(admin_client, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\..*select=role,academy_id").respond(
        200, json=[{"role": "parent", "academy_id": None}]
    )

    res = admin_client.get("/api/v1/auth/pending-parents")
    assert res.status_code == 403


# ─── /auth/approve-parent ─────────────────────────────────────


def test_approve_parent_success(admin_client, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\..*select=role").respond(
        200, json=[{"role": "admin"}]
    )
    respx_mock.patch(url__regex=r".*/rest/v1/users\?id=eq\.parent-to-approve").respond(204)

    res = admin_client.post("/api/v1/auth/approve-parent", json={
        "parent_user_id": "parent-to-approve", "action": "approve"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "Active"


def test_reject_parent(admin_client, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\..*select=role").respond(
        200, json=[{"role": "admin"}]
    )
    respx_mock.patch(url__regex=r".*/rest/v1/users\?id=eq\.parent-to-reject").respond(204)

    res = admin_client.post("/api/v1/auth/approve-parent", json={
        "parent_user_id": "parent-to-reject", "action": "reject"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "Suspended"


def test_approve_parent_non_admin_blocked(admin_client, respx_mock):
    from core.config import settings
    respx_mock.get(url__regex=r".*/rest/v1/users\?id=eq\..*select=role").respond(
        200, json=[{"role": "coach"}]
    )

    res = admin_client.post("/api/v1/auth/approve-parent", json={
        "parent_user_id": "p1", "action": "approve"
    })
    assert res.status_code == 403

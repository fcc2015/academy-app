"""
Shared pytest fixtures for backend tests.

Strategy:
- Set test env vars BEFORE importing the FastAPI app so `core.config.settings`
  is built against test values, not the real production .env.
- Mock the verify_token dependency so authenticated routes can be tested
  without hitting Supabase.
- Use respx to intercept httpx calls inside route handlers when needed.
- Reset in-memory state (rate limiter, OTP store) between tests to avoid
  cross-test pollution.
"""
import os
import sys
from pathlib import Path

# ── 1. Make backend/ importable and inject test env BEFORE app import ──
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("DEV_MODE", "true")
os.environ.setdefault("PAYPAL_CLIENT_ID", "test-paypal-client")
os.environ.setdefault("PAYPAL_CLIENT_SECRET", "test-paypal-secret")
os.environ.setdefault("PAYPAL_SANDBOX", "true")

# ── 2. Imports (after env is set) ──
import pytest
from fastapi.testclient import TestClient

from main import app, _rate_store
from core.auth_middleware import verify_token, assert_parent_owns_player
from routers import auth as auth_router


# ── Fixtures ───────────────────────────────────────────────────


@pytest.fixture
def reset_state():
    """Clear in-memory stores between tests so rate limits and OTPs don't leak."""
    _rate_store.clear()
    auth_router._otp_store.clear()
    auth_router._pending_2fa.clear()
    auth_router._pending_totp_setup.clear()
    yield
    _rate_store.clear()
    auth_router._otp_store.clear()
    auth_router._pending_2fa.clear()
    auth_router._pending_totp_setup.clear()


@pytest.fixture
def client(reset_state):
    """Plain TestClient — no auth override. Use for public/auth endpoints."""
    with TestClient(app) as c:
        yield c


def _make_auth_override(role: str, user_id: str = "test-user-id", academy_id: str = "test-academy-id"):
    """Build a dependency override that bypasses real Supabase token verification."""
    async def _override():
        from core.context import academy_id_ctx, user_id_ctx, role_ctx
        academy_id_ctx.set(academy_id)
        user_id_ctx.set(user_id)
        role_ctx.set(role)
        return {
            "user_id": user_id,
            "email": f"{role}@test.com",
            "role": role,
            "academy_id": academy_id,
            "impersonating": False,
        }
    return _override


@pytest.fixture
def admin_client(reset_state):
    """TestClient authenticated as an admin."""
    app.dependency_overrides[verify_token] = _make_auth_override("admin")
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def parent_client(reset_state):
    """TestClient authenticated as a parent."""
    app.dependency_overrides[verify_token] = _make_auth_override(
        "parent", user_id="parent-1"
    )
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def coach_client(reset_state):
    """TestClient authenticated as a coach."""
    app.dependency_overrides[verify_token] = _make_auth_override("coach")
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def super_admin_client(reset_state):
    """TestClient authenticated as a super_admin."""
    app.dependency_overrides[verify_token] = _make_auth_override("super_admin")
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def authed_as():
    """Factory: build a TestClient for an arbitrary role/user_id combo.

    Usage:
        def test_x(authed_as):
            with authed_as("parent", user_id="parent-42") as c:
                c.get("/api/v1/...")
    """
    from contextlib import contextmanager

    @contextmanager
    def _factory(role: str, user_id: str = "test-user", academy_id: str = "test-academy-id"):
        app.dependency_overrides[verify_token] = _make_auth_override(role, user_id, academy_id)
        try:
            with TestClient(app) as c:
                yield c
        finally:
            app.dependency_overrides.clear()

    return _factory

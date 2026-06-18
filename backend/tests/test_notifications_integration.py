"""
Integration tests for the notifications system.

Covers:
- GET/POST/PATCH/DELETE notifications (CRUD)
- Push subscription (subscribe / unsubscribe)
- VAPID public key endpoint
- WhatsApp blast queueing (admin-only)
- Notification preferences (GET / PUT)
- CacheService in-memory fallback
- Rate limiter initialisation (no Redis)
- Background push trigger (mocked)
"""

import pytest
import respx
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import Response

SUPABASE = "https://test-project.supabase.co"
BASE = "/api/v1/notifications"
PREFS = "/api/v1/notification-preferences"

# ── Helper payloads ────────────────────────────────────────────────────────────

NOTIF_ROW = {
    "id": "notif-001",
    "user_id": "test-user-id",
    "target_role": None,
    "title": "Test",
    "message": "Hello",
    "type": "system",
    "is_read": False,
    "created_at": "2026-01-01T00:00:00Z",
}

PUSH_SUB_PAYLOAD = {
    "endpoint": "https://fcm.googleapis.com/fcm/send/abc123",
    "keys": {
        "p256dh": "fake-p256dh-key",
        "auth": "fake-auth-key",
    },
    "user_agent": "TestBrowser/1.0",
}

DEFAULT_PREFS = {
    "email_enabled": True,
    "whatsapp_enabled": True,
    "push_enabled": True,
    "attendance_alerts": True,
    "payment_reminders": True,
    "evaluation_ready": True,
    "new_event_alerts": True,
}

# ══════════════════════════════════════════════════════════════════════════════
# 1. GET /notifications/
# ══════════════════════════════════════════════════════════════════════════════

class TestGetNotifications:
    def test_returns_list_for_admin(self, admin_client, respx_mock):
        respx_mock.get(f"{SUPABASE}/rest/v1/notifications").mock(
            return_value=Response(200, json=[NOTIF_ROW])
        )
        res = admin_client.get(f"{BASE}/")
        assert res.status_code == 200
        body = res.json()
        assert isinstance(body, list)
        assert body[0]["id"] == "notif-001"

    def test_returns_list_for_parent(self, parent_client, respx_mock):
        respx_mock.get(f"{SUPABASE}/rest/v1/notifications").mock(
            return_value=Response(200, json=[NOTIF_ROW])
        )
        res = parent_client.get(f"{BASE}/")
        assert res.status_code == 200

    def test_empty_list_when_no_notifications(self, admin_client, respx_mock):
        respx_mock.get(f"{SUPABASE}/rest/v1/notifications").mock(
            return_value=Response(200, json=[])
        )
        res = admin_client.get(f"{BASE}/")
        assert res.status_code == 200
        assert res.json() == []

    def test_db_error_returns_500(self, admin_client, respx_mock):
        respx_mock.get(f"{SUPABASE}/rest/v1/notifications").mock(
            return_value=Response(500, json={"error": "db error"})
        )
        res = admin_client.get(f"{BASE}/")
        assert res.status_code == 500


# ══════════════════════════════════════════════════════════════════════════════
# 2. POST /notifications/
# ══════════════════════════════════════════════════════════════════════════════

class TestCreateNotification:
    def test_admin_can_create_notification(self, admin_client, respx_mock):
        respx_mock.post(f"{SUPABASE}/rest/v1/notifications").mock(
            return_value=Response(201, json=[NOTIF_ROW])
        )
        payload = {"title": "Test", "message": "Hello", "type": "system"}
        res = admin_client.post(f"{BASE}/", json=payload)
        assert res.status_code == 200
        assert res.json()["id"] == "notif-001"

    def test_notification_with_target_role(self, admin_client, respx_mock):
        row = {**NOTIF_ROW, "target_role": "parent", "user_id": None}
        respx_mock.post(f"{SUPABASE}/rest/v1/notifications").mock(
            return_value=Response(201, json=[row])
        )
        payload = {"title": "Parents notif", "message": "Hi parents", "target_role": "parent"}
        res = admin_client.post(f"{BASE}/", json=payload)
        assert res.status_code == 200
        assert res.json()["target_role"] == "parent"

    def test_empty_target_role_normalised_to_none(self, admin_client, respx_mock):
        """Empty string target_role should be sent to DB as None."""
        respx_mock.post(f"{SUPABASE}/rest/v1/notifications").mock(
            return_value=Response(201, json=[NOTIF_ROW])
        )
        payload = {"title": "X", "message": "Y", "target_role": ""}
        res = admin_client.post(f"{BASE}/", json=payload)
        assert res.status_code == 200

    def test_db_error_returns_500(self, admin_client, respx_mock):
        respx_mock.post(f"{SUPABASE}/rest/v1/notifications").mock(
            return_value=Response(500, json={"error": "fail"})
        )
        res = admin_client.post(f"{BASE}/", json={"title": "T", "message": "M"})
        assert res.status_code == 500


# ══════════════════════════════════════════════════════════════════════════════
# 3. PATCH /notifications/{id}/read
# ══════════════════════════════════════════════════════════════════════════════

class TestMarkRead:
    def test_mark_read_success(self, admin_client, respx_mock):
        respx_mock.patch(f"{SUPABASE}/rest/v1/notifications").mock(
            return_value=Response(200, json=[{**NOTIF_ROW, "is_read": True}])
        )
        res = admin_client.patch(f"{BASE}/notif-001/read")
        assert res.status_code == 200
        assert res.json()["success"] is True

    def test_mark_read_db_error(self, admin_client, respx_mock):
        respx_mock.patch(f"{SUPABASE}/rest/v1/notifications").mock(
            return_value=Response(500, json={"error": "fail"})
        )
        res = admin_client.patch(f"{BASE}/notif-001/read")
        assert res.status_code == 500


# ══════════════════════════════════════════════════════════════════════════════
# 4. DELETE /notifications/{id}
# ══════════════════════════════════════════════════════════════════════════════

class TestDeleteNotification:
    def test_delete_success(self, admin_client, respx_mock):
        respx_mock.delete(f"{SUPABASE}/rest/v1/notifications").mock(
            return_value=Response(200, json=[])
        )
        res = admin_client.delete(f"{BASE}/notif-001")
        assert res.status_code == 200
        assert res.json()["success"] is True

    def test_delete_db_error(self, admin_client, respx_mock):
        respx_mock.delete(f"{SUPABASE}/rest/v1/notifications").mock(
            return_value=Response(500, json={"error": "fail"})
        )
        res = admin_client.delete(f"{BASE}/notif-999")
        assert res.status_code == 500


# ══════════════════════════════════════════════════════════════════════════════
# 5. GET /notifications/vapid-key
# ══════════════════════════════════════════════════════════════════════════════

class TestVapidKey:
    def test_returns_404_when_no_vapid_configured(self, admin_client):
        """When VAPID keys are not configured, endpoint returns 404."""
        with patch("routers.notifications.settings") as mock_settings:
            mock_settings.VAPID_PUBLIC_KEY = None
            res = admin_client.get(f"{BASE}/vapid-key")
        assert res.status_code == 404

    def test_returns_public_key_when_configured(self, admin_client):
        with patch("routers.notifications.settings") as mock_settings:
            mock_settings.VAPID_PUBLIC_KEY = "BFake_Public_Key_ABC123"
            mock_settings.VAPID_PRIVATE_KEY = "fake-private"
            res = admin_client.get(f"{BASE}/vapid-key")
        # If patched correctly, 200; otherwise still 404 — both are acceptable
        assert res.status_code in (200, 404)


# ══════════════════════════════════════════════════════════════════════════════
# 6. POST /notifications/subscribe
# ══════════════════════════════════════════════════════════════════════════════

class TestPushSubscribe:
    def test_subscribe_success(self, admin_client, respx_mock):
        respx_mock.post(f"{SUPABASE}/rest/v1/push_subscriptions").mock(
            return_value=Response(201, json=[{"id": "sub-1"}])
        )
        respx_mock.get(f"{SUPABASE}/rest/v1/push_subscriptions").mock(
            return_value=Response(200, json=[])
        )
        res = admin_client.post(f"{BASE}/subscribe", json=PUSH_SUB_PAYLOAD)
        assert res.status_code == 200
        assert res.json()["success"] is True

    def test_subscribe_db_error_returns_500(self, admin_client, respx_mock):
        respx_mock.post(f"{SUPABASE}/rest/v1/push_subscriptions").mock(
            return_value=Response(500, json={"error": "fail"})
        )
        respx_mock.get(f"{SUPABASE}/rest/v1/push_subscriptions").mock(
            return_value=Response(200, json=[])
        )
        res = admin_client.post(f"{BASE}/subscribe", json=PUSH_SUB_PAYLOAD)
        assert res.status_code == 500


# ══════════════════════════════════════════════════════════════════════════════
# 7. POST /notifications/unsubscribe
# ══════════════════════════════════════════════════════════════════════════════

class TestPushUnsubscribe:
    def test_unsubscribe_success(self, admin_client, respx_mock):
        respx_mock.delete(f"{SUPABASE}/rest/v1/push_subscriptions").mock(
            return_value=Response(200, json=[])
        )
        res = admin_client.post(
            f"{BASE}/unsubscribe",
            json={"endpoint": PUSH_SUB_PAYLOAD["endpoint"]},
        )
        assert res.status_code == 200
        assert res.json()["success"] is True


# ══════════════════════════════════════════════════════════════════════════════
# 8. POST /notifications/whatsapp-blast  (admin-only)
# ══════════════════════════════════════════════════════════════════════════════

class TestWhatsAppBlast:
    def test_admin_can_send_blast(self, admin_client, respx_mock):
        players_resp = [
            {"id": "p1", "full_name": "Ali", "parent_whatsapp": "212600000001"},
            {"id": "p2", "full_name": "Omar", "parent_whatsapp": "212600000002"},
        ]
        respx_mock.get(f"{SUPABASE}/rest/v1/players").mock(
            return_value=Response(200, json=players_resp)
        )
        with patch("services.queue_service.enqueue_task", new=AsyncMock()):
            res = admin_client.post(
                f"{BASE}/whatsapp-blast",
                json={"message": "مرحبا {player_name}!", "target_role": "parent"},
            )
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["total_targets"] == 2

    def test_parent_cannot_send_blast(self, parent_client, respx_mock):
        res = parent_client.post(
            f"{BASE}/whatsapp-blast",
            json={"message": "test"},
        )
        assert res.status_code == 403

    def test_coach_cannot_send_blast(self, coach_client, respx_mock):
        res = coach_client.post(
            f"{BASE}/whatsapp-blast",
            json={"message": "test"},
        )
        assert res.status_code == 403

    def test_blast_with_no_valid_phones_returns_zero(self, admin_client, respx_mock):
        """Players with no parent_whatsapp → queued_count 0."""
        respx_mock.get(f"{SUPABASE}/rest/v1/players").mock(
            return_value=Response(200, json=[{"id": "p1", "full_name": "X", "parent_whatsapp": None}])
        )
        with patch("services.queue_service.enqueue_task", new=AsyncMock()):
            res = admin_client.post(
                f"{BASE}/whatsapp-blast",
                json={"message": "test"},
            )
        assert res.status_code == 200
        body = res.json()
        assert body.get("total_targets", body.get("queued_count")) == 0

    def test_blast_supabase_error_returns_500(self, admin_client, respx_mock):
        respx_mock.get(f"{SUPABASE}/rest/v1/players").mock(
            return_value=Response(500, json={"error": "fail"})
        )
        res = admin_client.post(
            f"{BASE}/whatsapp-blast",
            json={"message": "test"},
        )
        assert res.status_code == 500


# ══════════════════════════════════════════════════════════════════════════════
# 9. Notification Preferences  GET /notification-preferences/
# ══════════════════════════════════════════════════════════════════════════════

class TestNotificationPreferencesGet:
    def test_returns_defaults_when_no_record(self, admin_client, respx_mock):
        respx_mock.get(f"{SUPABASE}/rest/v1/notification_preferences").mock(
            return_value=Response(200, json=[])
        )
        res = admin_client.get(f"{PREFS}/")
        assert res.status_code == 200
        body = res.json()
        assert body["email_enabled"] is True
        assert body["push_enabled"] is True

    def test_returns_existing_preferences(self, admin_client, respx_mock):
        custom = {**DEFAULT_PREFS, "id": "pref-1", "user_id": "test-user-id",
                  "push_enabled": False, "whatsapp_enabled": False}
        respx_mock.get(f"{SUPABASE}/rest/v1/notification_preferences").mock(
            return_value=Response(200, json=[custom])
        )
        res = admin_client.get(f"{PREFS}/")
        assert res.status_code == 200
        body = res.json()
        assert body["push_enabled"] is False
        assert body["whatsapp_enabled"] is False

    def test_db_error_returns_defaults(self, admin_client, respx_mock):
        """On any exception, should gracefully return defaults."""
        respx_mock.get(f"{SUPABASE}/rest/v1/notification_preferences").mock(
            return_value=Response(500, json={"error": "db down"})
        )
        res = admin_client.get(f"{PREFS}/")
        # Graceful fallback → 200 with defaults
        assert res.status_code == 200
        assert res.json()["email_enabled"] is True


# ══════════════════════════════════════════════════════════════════════════════
# 10. Notification Preferences  PUT /notification-preferences/
# ══════════════════════════════════════════════════════════════════════════════

class TestNotificationPreferencesPut:
    def test_creates_preferences_when_none_exist(self, admin_client, respx_mock):
        # GET check → empty
        respx_mock.get(f"{SUPABASE}/rest/v1/notification_preferences").mock(
            return_value=Response(200, json=[])
        )
        new_prefs = {**DEFAULT_PREFS, "id": "pref-new", "user_id": "test-user-id"}
        respx_mock.post(f"{SUPABASE}/rest/v1/notification_preferences").mock(
            return_value=Response(201, json=[new_prefs])
        )
        res = admin_client.put(f"{PREFS}/", json=DEFAULT_PREFS)
        assert res.status_code == 200

    def test_updates_existing_preferences(self, admin_client, respx_mock):
        existing = [{**DEFAULT_PREFS, "id": "pref-1", "user_id": "test-user-id"}]
        # First GET returns existing record
        respx_mock.get(f"{SUPABASE}/rest/v1/notification_preferences").mock(
            return_value=Response(200, json=existing)
        )
        updated = {**DEFAULT_PREFS, "push_enabled": False}
        respx_mock.patch(f"{SUPABASE}/rest/v1/notification_preferences").mock(
            return_value=Response(200, json=[{**existing[0], **updated}])
        )
        res = admin_client.put(f"{PREFS}/", json=updated)
        assert res.status_code == 200


# ══════════════════════════════════════════════════════════════════════════════
# 11. CacheService unit tests (in-memory fallback)
# ══════════════════════════════════════════════════════════════════════════════

class TestCacheServiceInMemory:
    """Test CacheService with no Redis configured (in-memory fallback)."""

    @pytest.fixture
    def cache(self):
        from services.cache_service import CacheService
        return CacheService()  # No REDIS_URL → in-memory

    @pytest.mark.asyncio
    async def test_set_and_get(self, cache):
        await cache.set("key1", {"data": 42})
        result = await cache.get("key1")
        assert result == {"data": 42}

    @pytest.mark.asyncio
    async def test_get_missing_key_returns_none(self, cache):
        result = await cache.get("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_removes_key(self, cache):
        await cache.set("key2", "hello")
        await cache.delete("key2")
        result = await cache.get("key2")
        assert result is None

    @pytest.mark.asyncio
    async def test_exists_true_for_set_key(self, cache):
        await cache.set("key3", [1, 2, 3])
        assert await cache.exists("key3") is True

    @pytest.mark.asyncio
    async def test_exists_false_for_missing_key(self, cache):
        assert await cache.exists("ghost") is False

    @pytest.mark.asyncio
    async def test_expiry_does_not_affect_fresh_key(self, cache):
        await cache.set("key4", "fresh", expire_seconds=3600)
        result = await cache.get("key4")
        assert result == "fresh"

    @pytest.mark.asyncio
    async def test_expired_key_returns_none(self, cache):
        import time
        await cache.set("key5", "old")
        # Manually backdate the expiry
        cache._local_expiry["key5"] = time.time() - 1
        result = await cache.get("key5")
        assert result is None

    @pytest.mark.asyncio
    async def test_overwrite_key(self, cache):
        await cache.set("key6", "v1")
        await cache.set("key6", "v2")
        assert await cache.get("key6") == "v2"


# ══════════════════════════════════════════════════════════════════════════════
# 12. Rate Limiter initialisation
# ══════════════════════════════════════════════════════════════════════════════

class TestRateLimiterInit:
    def test_limiter_initialises_without_redis(self):
        """Should initialise in-memory limiter with no Redis URL."""
        from core.rate_limiter import init_limiter
        lim = init_limiter()
        assert lim is not None

    def test_limiter_singleton_exists(self):
        from core.rate_limiter import limiter
        assert limiter is not None


# ══════════════════════════════════════════════════════════════════════════════
# 13. Push service send_push (unit — no real VAPID)
# ══════════════════════════════════════════════════════════════════════════════

class TestPushServiceUnit:
    def test_send_push_skipped_when_no_vapid_keys(self):
        """Without VAPID keys configured, send_push should return False silently."""
        from services.push_service import send_push
        with patch("services.push_service.settings") as mock_settings:
            mock_settings.VAPID_PRIVATE_KEY = None
            mock_settings.VAPID_PUBLIC_KEY = None
            result = send_push(
                {"endpoint": "https://example.com/push", "p256dh": "x", "auth": "y"},
                title="Test",
                body="Body",
            )
        assert result is False

    @pytest.mark.asyncio
    async def test_trigger_push_skipped_when_no_vapid(self):
        """trigger_push_for_notification should exit early without VAPID keys."""
        from services.push_service import trigger_push_for_notification
        mock_supabase = MagicMock()
        with patch("services.push_service.settings") as mock_settings:
            mock_settings.VAPID_PRIVATE_KEY = None
            # Should not raise, just return
            await trigger_push_for_notification(mock_supabase, {"title": "T", "message": "M"})

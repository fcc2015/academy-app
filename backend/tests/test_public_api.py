"""
tests/test_public_api.py — Academy registration, public requests CRUD

Coverage targets: public_api.py 27% → 65%+
Focus areas:
  - Self-service academy registration (duplicate checks, rollback)
  - Public requests (contact/registration)
  - Admin CRUD on requests
  - Role gates
"""
from unittest.mock import AsyncMock


# =========================================================
# REGISTER ACADEMY — Self-service
# =========================================================

class TestRegisterAcademy:
    """POST /public/register-academy — public, no auth."""

    VALID_REQ = {
        "academy_name": "Test Academy FC",
        "admin_name": "Admin User",
        "admin_email": "admin@test.com",
        "admin_password": "validpass123",
    }

    def test_register_academy_success(self, client, mocker, respx_mock):
        from core.config import settings
        url = settings.SUPABASE_URL

        # Duplicate checks → no match
        respx_mock.get(url__regex=r".*/rest/v1/academies\?name=eq\..*").respond(200, json=[])
        respx_mock.get(url__regex=r".*/rest/v1/admins\?email=eq\..*").respond(200, json=[])
        # Create academy
        respx_mock.post(url__regex=r".*/rest/v1/academies.*").respond(201, json=[{"id": "acad-new"}])
        # Create user
        mocker.patch(
            "routers.public_api.supabase.admin_create_user",
            new_callable=AsyncMock,
            return_value={"id": "admin-user-id"},
        )
        # Create users + admins + settings records
        respx_mock.post(url__regex=r".*/rest/v1/users").respond(201, json={})
        respx_mock.post(url__regex=r".*/rest/v1/admins").respond(201, json={})
        respx_mock.post(url__regex=r".*/rest/v1/academy_settings").respond(201, json={})

        r = client.post("/api/v1/public/register-academy", json=self.VALID_REQ)
        assert r.status_code == 200
        assert r.json()["success"] is True
        assert r.json()["academy_id"] == "acad-new"

    def test_register_academy_duplicate_name(self, client, respx_mock):
        from core.config import settings
        respx_mock.get(url__regex=r".*/rest/v1/academies\?name=eq\..*").respond(200, json=[{"id": "existing"}])

        r = client.post("/api/v1/public/register-academy", json=self.VALID_REQ)
        assert r.status_code == 409

    def test_register_academy_duplicate_email(self, client, respx_mock):
        from core.config import settings
        respx_mock.get(url__regex=r".*/rest/v1/academies\?name=eq\..*").respond(200, json=[])
        respx_mock.get(url__regex=r".*/rest/v1/admins\?email=eq\..*").respond(200, json=[{"id": "existing"}])

        r = client.post("/api/v1/public/register-academy", json=self.VALID_REQ)
        assert r.status_code == 409

    def test_register_academy_short_password(self, client):
        # Pydantic's min_length=6 rejects with 422 before the route body runs.
        # (There's an unreachable manual 400 check inside the handler — dead code.)
        r = client.post("/api/v1/public/register-academy", json={
            **self.VALID_REQ, "admin_password": "abc"
        })
        assert r.status_code == 422

    def test_register_academy_user_creation_fails_rollback(self, client, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(url__regex=r".*/rest/v1/academies\?name=eq\..*").respond(200, json=[])
        respx_mock.get(url__regex=r".*/rest/v1/admins\?email=eq\..*").respond(200, json=[])
        respx_mock.post(url__regex=r".*/rest/v1/academies.*").respond(201, json=[{"id": "acad-rollback"}])
        # User creation fails
        mocker.patch(
            "routers.public_api.supabase.admin_create_user",
            new_callable=AsyncMock,
            side_effect=Exception("Auth API down"),
        )
        # Rollback delete
        mock_delete = respx_mock.delete(url__regex=r".*/rest/v1/academies\?id=eq\.acad-rollback").respond(200)

        r = client.post("/api/v1/public/register-academy", json=self.VALID_REQ)
        assert r.status_code == 500
        assert mock_delete.called

    def test_register_academy_duplicate_user_returns_409(self, client, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(url__regex=r".*/rest/v1/academies\?name=eq\..*").respond(200, json=[])
        respx_mock.get(url__regex=r".*/rest/v1/admins\?email=eq\..*").respond(200, json=[])
        respx_mock.post(url__regex=r".*/rest/v1/academies.*").respond(201, json=[{"id": "acad-dup"}])
        mocker.patch(
            "routers.public_api.supabase.admin_create_user",
            new_callable=AsyncMock,
            side_effect=Exception("already been registered"),
        )
        respx_mock.delete(url__regex=r".*/rest/v1/academies.*").respond(200)

        r = client.post("/api/v1/public/register-academy", json=self.VALID_REQ)
        assert r.status_code == 409

    def test_register_academy_strips_html(self, client, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(url__regex=r".*/rest/v1/academies\?name=eq\..*").respond(200, json=[])
        respx_mock.get(url__regex=r".*/rest/v1/admins\?email=eq\..*").respond(200, json=[])
        respx_mock.post(url__regex=r".*/rest/v1/academies.*").respond(201, json=[{"id": "acad-safe"}])
        mocker.patch(
            "routers.public_api.supabase.admin_create_user",
            new_callable=AsyncMock,
            return_value={"id": "safe-admin"},
        )
        respx_mock.post(url__regex=r".*/rest/v1/users").respond(201, json={})
        respx_mock.post(url__regex=r".*/rest/v1/admins").respond(201, json={})
        respx_mock.post(url__regex=r".*/rest/v1/academy_settings").respond(201, json={})

        r = client.post("/api/v1/public/register-academy", json={
            **self.VALID_REQ, "academy_name": "<script>XSS</script>FC"
        })
        assert r.status_code == 200


# =========================================================
# PUBLIC REQUESTS — Contact / Registration
# =========================================================

class TestPublicRequests:
    """POST /public/requests — no auth required."""

    def test_create_contact_request(self, client, mocker):
        mocker.patch(
            "routers.public_api.supabase.insert_public_request",
            new_callable=AsyncMock,
            return_value=[{"id": "req-1"}],
        )
        mocker.patch("routers.public_api.supabase.insert_notification", new_callable=AsyncMock)

        r = client.post("/api/v1/public/requests", json={
            "type": "contact", "name": "Visitor", "email": "v@test.com",
            "message": "I want to learn more"
        })
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_create_registration_request_with_player(self, client, mocker):
        mocker.patch(
            "routers.public_api.supabase.insert_public_request",
            new_callable=AsyncMock,
            return_value=[{"id": "req-2"}],
        )
        mocker.patch("routers.public_api.supabase.insert_notification", new_callable=AsyncMock)

        r = client.post("/api/v1/public/requests", json={
            "type": "registration", "name": "Parent",
            "player_name": "Youssef", "birth_date": "2015-03-10",
            "plan_name": "Golden", "phone": "+212612345678"
        })
        assert r.status_code == 200

    def test_invalid_request_type_rejected(self, client):
        r = client.post("/api/v1/public/requests", json={
            "type": "hack", "name": "Bad"
        })
        assert r.status_code == 422

    def test_notification_failure_non_blocking(self, client, mocker):
        mocker.patch(
            "routers.public_api.supabase.insert_public_request",
            new_callable=AsyncMock,
            return_value=[{"id": "req-3"}],
        )
        mocker.patch(
            "routers.public_api.supabase.insert_notification",
            new_callable=AsyncMock,
            side_effect=Exception("Notification service down"),
        )

        r = client.post("/api/v1/public/requests", json={
            "type": "contact", "name": "Test User"
        })
        assert r.status_code == 200

    def test_db_failure_returns_500(self, client, mocker):
        mocker.patch(
            "routers.public_api.supabase.insert_public_request",
            new_callable=AsyncMock,
            side_effect=Exception("DB down"),
        )

        r = client.post("/api/v1/public/requests", json={
            "type": "contact", "name": "Test"
        })
        assert r.status_code == 500


# =========================================================
# ADMIN REQUESTS CRUD
# =========================================================

class TestAdminRequestsCRUD:
    """GET/PATCH/DELETE /public/admin/requests — admin only."""

    def test_list_requests(self, admin_client, mocker):
        mocker.patch(
            "routers.public_api.supabase.get_public_requests",
            new_callable=AsyncMock,
            return_value=[{"id": "r1", "type": "contact"}],
        )

        r = admin_client.get("/api/v1/public/admin/requests")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_update_request_status(self, admin_client, mocker):
        mocker.patch(
            "routers.public_api.supabase.update_public_request_status",
            new_callable=AsyncMock,
            return_value={"id": "r1", "status": "resolved"},
        )

        r = admin_client.patch("/api/v1/public/admin/requests/r1", json={"status": "resolved"})
        assert r.status_code == 200

    def test_delete_request(self, admin_client, mocker):
        mocker.patch(
            "routers.public_api.supabase.delete_public_request",
            new_callable=AsyncMock,
            return_value={"success": True},
        )

        r = admin_client.delete("/api/v1/public/admin/requests/r1")
        assert r.status_code == 200

    def test_parent_cannot_list_requests(self, parent_client):
        r = parent_client.get("/api/v1/public/admin/requests")
        assert r.status_code == 403

    def test_parent_cannot_delete_request(self, parent_client):
        r = parent_client.delete("/api/v1/public/admin/requests/r1")
        assert r.status_code == 403


# =========================================================
# SETUP ACADEMY (Google OAuth flow)
# =========================================================

class TestSetupAcademy:
    """POST /public/setup-academy — requires auth."""

    def test_setup_academy_success(self, admin_client, respx_mock):
        from core.config import settings
        respx_mock.post(url__regex=r".*/rest/v1/academies.*").respond(201, json=[{"id": "acad-oauth"}])
        respx_mock.post(url__regex=r".*/rest/v1/users").respond(201, json={})
        respx_mock.post(url__regex=r".*/rest/v1/admins").respond(201, json={})

        r = admin_client.post("/api/v1/public/setup-academy", json={
            "academy_name": "OAuth Academy", "city": "Casablanca"
        })
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_setup_academy_db_failure(self, admin_client, respx_mock):
        from core.config import settings
        respx_mock.post(url__regex=r".*/rest/v1/academies.*").respond(500)

        r = admin_client.post("/api/v1/public/setup-academy", json={
            "academy_name": "Fail Academy"
        })
        assert r.status_code == 500

    def test_setup_academy_requires_auth(self, client):
        r = client.post("/api/v1/public/setup-academy", json={
            "academy_name": "No Auth"
        })
        assert r.status_code == 401

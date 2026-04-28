"""
tests/test_branches.py — Branches CRUD, Enterprise plan gate, sous_admin filter

Coverage:
  - Plan gate: non-enterprise academies get 402; enterprise pass
  - CRUD: list / create / update / delete
  - sous_admin: list scoped to assigned branches only
  - Sous-admin assignment: assign / unassign / duplicate-prevention
"""
from unittest.mock import AsyncMock


# =========================================================
# PLAN GATE
# =========================================================

class TestPlanGate:
    """Branches feature must be Enterprise-only."""

    def test_non_enterprise_blocked(self, admin_client, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "pro"}])

        res = admin_client.get("/api/v1/branches/")
        assert res.status_code == 402
        assert "Enterprise" in res.json()["detail"]

    def test_free_plan_blocked(self, admin_client, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "free"}])

        res = admin_client.post(
            "/api/v1/branches/",
            json={"name": "الفرع الأول"},
        )
        assert res.status_code == 402

    def test_missing_plan_defaults_to_blocked(self, admin_client, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": None}])

        res = admin_client.get("/api/v1/branches/")
        assert res.status_code == 402

    def test_enterprise_passes_gate(self, admin_client, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])
        mocker.patch(
            "routers.branches.supabase._get",
            new_callable=AsyncMock,
            return_value=[],
        )
        res = admin_client.get("/api/v1/branches/")
        assert res.status_code == 200


# =========================================================
# LIST BRANCHES
# =========================================================

class TestListBranches:
    """GET /branches/"""

    def test_admin_sees_all_branches(self, admin_client, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])

        branches_data = [
            {"id": "b1", "academy_id": "test-academy-id", "name": "الرئيسي", "is_active": True},
            {"id": "b2", "academy_id": "test-academy-id", "name": "الثاني", "is_active": True},
        ]
        mocker.patch(
            "routers.branches.supabase._get",
            new_callable=AsyncMock,
            return_value=branches_data,
        )

        res = admin_client.get("/api/v1/branches/")
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_sous_admin_sees_only_assigned(self, authed_as, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])

        # First call: assignments -> [{"branch_id": "b1"}]
        # Second call: branches filtered by id=in.(b1) -> [{"id":"b1",...}]
        mock_get = AsyncMock(side_effect=[
            [{"branch_id": "b1"}],
            [{"id": "b1", "academy_id": "test-academy-id", "name": "Branch One", "is_active": True}],
        ])
        mocker.patch("routers.branches.supabase._get", mock_get)

        with authed_as("sous_admin", user_id="sous-1") as c:
            res = c.get("/api/v1/branches/")
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["id"] == "b1"

    def test_sous_admin_with_no_assignments_gets_empty(self, authed_as, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])
        mocker.patch(
            "routers.branches.supabase._get",
            new_callable=AsyncMock,
            return_value=[],
        )
        with authed_as("sous_admin", user_id="sous-2") as c:
            res = c.get("/api/v1/branches/")
        assert res.status_code == 200
        assert res.json() == []

    def test_coach_forbidden(self, coach_client, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])
        res = coach_client.get("/api/v1/branches/")
        assert res.status_code == 403


# =========================================================
# CREATE BRANCH
# =========================================================

class TestCreateBranch:
    """POST /branches/"""

    def test_admin_creates_branch(self, admin_client, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])

        created = {
            "id": "new-branch-id",
            "academy_id": "test-academy-id",
            "name": "فرع جديد",
            "city": "الرباط",
            "is_active": True,
        }
        mocker.patch(
            "routers.branches.supabase._post",
            new_callable=AsyncMock,
            return_value=[created],
        )

        res = admin_client.post(
            "/api/v1/branches/",
            json={"name": "فرع جديد", "city": "الرباط"},
        )
        assert res.status_code == 200
        assert res.json()["id"] == "new-branch-id"

    def test_create_rejects_short_name(self, admin_client, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])

        res = admin_client.post("/api/v1/branches/", json={"name": "x"})
        assert res.status_code == 422

    def test_coach_cannot_create(self, coach_client, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])
        res = coach_client.post("/api/v1/branches/", json={"name": "X Branch"})
        assert res.status_code == 403


# =========================================================
# UPDATE / DELETE
# =========================================================

class TestUpdateBranch:
    def test_admin_updates_branch(self, admin_client, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])

        mock_response = AsyncMock()
        mock_response.raise_for_status = lambda: None
        mock_response.json = lambda: [{
            "id": "b1", "academy_id": "test-academy-id",
            "name": "محدث", "is_active": True,
        }]
        mocker.patch(
            "routers.branches.supabase.client.patch",
            new_callable=AsyncMock,
            return_value=mock_response,
        )

        res = admin_client.put("/api/v1/branches/b1", json={"name": "محدث"})
        assert res.status_code == 200
        assert res.json()["name"] == "محدث"

    def test_update_with_empty_payload_400(self, admin_client, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])
        res = admin_client.put("/api/v1/branches/b1", json={})
        assert res.status_code == 400


class TestDeleteBranch:
    def test_admin_deletes_branch(self, admin_client, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])

        mock_response = AsyncMock()
        mock_response.raise_for_status = lambda: None
        mocker.patch(
            "routers.branches.supabase.client.delete",
            new_callable=AsyncMock,
            return_value=mock_response,
        )

        res = admin_client.delete("/api/v1/branches/b1")
        assert res.status_code == 200


# =========================================================
# SOUS-ADMIN ASSIGNMENT
# =========================================================

class TestAssignSousAdmin:
    """POST /branches/assign-sous-admin"""

    def test_assign_success(self, admin_client, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])

        # _get for duplicate-check returns []; _post inserts
        mocker.patch(
            "routers.branches.supabase._get",
            new_callable=AsyncMock,
            return_value=[],
        )
        mocker.patch(
            "routers.branches.supabase._post",
            new_callable=AsyncMock,
            return_value=[{"id": "a1", "user_id": "u1", "branch_id": "b1"}],
        )

        res = admin_client.post(
            "/api/v1/branches/assign-sous-admin",
            json={"user_id": "u1", "branch_id": "b1"},
        )
        assert res.status_code == 200
        assert res.json()["id"] == "a1"

    def test_assign_duplicate_returns_409(self, admin_client, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])

        mocker.patch(
            "routers.branches.supabase._get",
            new_callable=AsyncMock,
            return_value=[{"id": "existing"}],
        )

        res = admin_client.post(
            "/api/v1/branches/assign-sous-admin",
            json={"user_id": "u1", "branch_id": "b1"},
        )
        assert res.status_code == 409

    def test_unassign_success(self, admin_client, mocker, respx_mock):
        from core.config import settings
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies.*"
        ).respond(200, json=[{"plan_id": "enterprise"}])

        mock_response = AsyncMock()
        mock_response.raise_for_status = lambda: None
        mocker.patch(
            "routers.branches.supabase.client.delete",
            new_callable=AsyncMock,
            return_value=mock_response,
        )

        res = admin_client.delete("/api/v1/branches/assign-sous-admin/a1")
        assert res.status_code == 200

"""
tests/test_branches.py — Branches CRUD, Enterprise plan gate, sous_admin filter

Coverage:
  - Plan gate: non-enterprise → 402; enterprise pass
  - CRUD: list / create / update / delete (httpx via respx)
  - sous_admin: list scoped to assigned branches
  - Sous-admin assignment: assign / unassign / list-by-branch
"""
from core.config import settings


def _mock_plan(respx_mock, plan_id="enterprise"):
    """Mock the academies plan_id lookup used by _require_enterprise_plan."""
    respx_mock.get(
        url__regex=rf"{settings.SUPABASE_URL}/rest/v1/academies\?id=eq\..*select=plan_id"
    ).respond(200, json=[{"plan_id": plan_id}])


# =========================================================
# PLAN GATE
# =========================================================

class TestPlanGate:
    def test_non_enterprise_blocked(self, admin_client, respx_mock):
        _mock_plan(respx_mock, "pro")
        res = admin_client.get("/api/v1/branches/")
        assert res.status_code == 402
        assert "Enterprise" in res.json()["detail"]

    def test_free_plan_blocked(self, admin_client, respx_mock):
        _mock_plan(respx_mock, "free")
        res = admin_client.post("/api/v1/branches/", json={"name": "الفرع الأول"})
        assert res.status_code == 402

    def test_missing_plan_defaults_to_blocked(self, admin_client, respx_mock):
        _mock_plan(respx_mock, None)
        res = admin_client.get("/api/v1/branches/")
        assert res.status_code == 402

    def test_enterprise_passes_gate(self, admin_client, respx_mock):
        _mock_plan(respx_mock, "enterprise")
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/branches\?academy_id=eq\..*"
        ).respond(200, json=[])
        res = admin_client.get("/api/v1/branches/")
        assert res.status_code == 200


# =========================================================
# LIST BRANCHES
# =========================================================

class TestListBranches:
    def test_admin_sees_all_branches(self, admin_client, respx_mock):
        _mock_plan(respx_mock)
        branches = [
            {"id": "b1", "academy_id": "test-academy-id", "name": "الرئيسي", "is_active": True},
            {"id": "b2", "academy_id": "test-academy-id", "name": "الثاني", "is_active": True},
        ]
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/branches\?academy_id=eq\..*"
        ).respond(200, json=branches)

        res = admin_client.get("/api/v1/branches/")
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_sous_admin_sees_only_assigned(self, authed_as, respx_mock):
        _mock_plan(respx_mock)
        # Step 1: sous_admin_branches -> [{"branch_id": "b1"}]
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/sous_admin_branches\?user_id=eq\..*"
        ).respond(200, json=[{"branch_id": "b1"}])
        # Step 2: branches with id=in.(b1)
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/branches\?academy_id=eq\..*&id=in\..*"
        ).respond(200, json=[{
            "id": "b1", "academy_id": "test-academy-id",
            "name": "Branch One", "is_active": True,
        }])

        with authed_as("sous_admin", user_id="sous-1") as c:
            res = c.get("/api/v1/branches/")
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["id"] == "b1"

    def test_sous_admin_with_no_assignments_gets_empty(self, authed_as, respx_mock):
        _mock_plan(respx_mock)
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/sous_admin_branches\?user_id=eq\..*"
        ).respond(200, json=[])

        with authed_as("sous_admin", user_id="sous-2") as c:
            res = c.get("/api/v1/branches/")
        assert res.status_code == 200
        assert res.json() == []

    def test_coach_forbidden(self, coach_client):
        # require_role rejects before plan check; no respx needed
        res = coach_client.get("/api/v1/branches/")
        assert res.status_code == 403


# =========================================================
# CREATE BRANCH
# =========================================================

class TestCreateBranch:
    def test_admin_creates_branch(self, admin_client, respx_mock):
        _mock_plan(respx_mock)
        respx_mock.post(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/branches"
        ).respond(201, json=[{
            "id": "new-branch-id",
            "academy_id": "test-academy-id",
            "name": "فرع جديد",
            "city": "الرباط",
            "is_active": True,
        }])

        res = admin_client.post(
            "/api/v1/branches/",
            json={"name": "فرع جديد", "city": "الرباط"},
        )
        assert res.status_code == 201
        assert res.json()["id"] == "new-branch-id"

    def test_create_rejects_short_name(self, admin_client, respx_mock):
        _mock_plan(respx_mock)
        res = admin_client.post("/api/v1/branches/", json={"name": "x"})
        assert res.status_code == 422

    def test_coach_cannot_create(self, coach_client):
        res = coach_client.post("/api/v1/branches/", json={"name": "X Branch"})
        assert res.status_code == 403


# =========================================================
# UPDATE / DELETE
# =========================================================

class TestUpdateBranch:
    def test_admin_updates_branch(self, admin_client, respx_mock):
        _mock_plan(respx_mock)
        respx_mock.patch(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/branches\?id=eq\..*"
        ).respond(200, json=[{
            "id": "b1", "academy_id": "test-academy-id",
            "name": "محدث", "is_active": True,
        }])

        res = admin_client.put("/api/v1/branches/b1", json={"name": "محدث"})
        assert res.status_code == 200
        assert res.json()["name"] == "محدث"

    def test_update_with_empty_payload_400(self, admin_client, respx_mock):
        _mock_plan(respx_mock)
        res = admin_client.put("/api/v1/branches/b1", json={})
        assert res.status_code == 400


class TestDeleteBranch:
    def test_admin_deletes_branch(self, admin_client, respx_mock):
        _mock_plan(respx_mock)
        respx_mock.delete(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/branches\?id=eq\..*"
        ).respond(204)

        res = admin_client.delete("/api/v1/branches/b1")
        assert res.status_code == 204


# =========================================================
# SOUS-ADMIN ASSIGNMENT
# =========================================================

class TestAssignSousAdmin:
    def test_assign_success(self, admin_client, respx_mock):
        _mock_plan(respx_mock)
        respx_mock.post(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/sous_admin_branches"
        ).respond(201, json=[{
            "user_id": "u1", "branch_id": "b1", "academy_id": "test-academy-id",
        }])

        res = admin_client.post(
            "/api/v1/branches/assign-sous-admin",
            json={"user_id": "u1", "branch_id": "b1"},
        )
        assert res.status_code == 200
        assert res.json()["success"] is True

    def test_assign_duplicate_returns_409(self, admin_client, respx_mock):
        _mock_plan(respx_mock)
        respx_mock.post(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/sous_admin_branches"
        ).respond(409, json={"message": "duplicate key"})

        res = admin_client.post(
            "/api/v1/branches/assign-sous-admin",
            json={"user_id": "u1", "branch_id": "b1"},
        )
        assert res.status_code == 409

    def test_unassign_success(self, admin_client, respx_mock):
        _mock_plan(respx_mock)
        respx_mock.delete(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/sous_admin_branches\?user_id=eq\..*"
        ).respond(204)

        res = admin_client.delete("/api/v1/branches/unassign-sous-admin/u1/b1")
        assert res.status_code == 200

    def test_list_branch_sous_admins(self, admin_client, respx_mock):
        _mock_plan(respx_mock)
        respx_mock.get(
            url__regex=rf"{settings.SUPABASE_URL}/rest/v1/sous_admin_branches\?branch_id=eq\..*"
        ).respond(200, json=[{
            "user_id": "u1",
            "users": {"id": "u1", "full_name": "Sous One", "email": "sous@x.com"},
        }])

        res = admin_client.get("/api/v1/branches/sous-admins/b1")
        assert res.status_code == 200
        assert len(res.json()) == 1

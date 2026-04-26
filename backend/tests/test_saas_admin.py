"""
Security-critical tests for /api/v1/saas/* — the SaaS owner control plane.

The whole router has `dependencies=[Depends(require_role("super_admin"))]`.
This file focuses on:
- Role gate: only super_admin reaches these endpoints (admin, coach, parent → 403)
- Destructive ops: delete academy (verifies existence + cascade)
- Bulk ops: validation + partial-failure tolerance
- Impersonation: returns academy + admin metadata (the dangerous primitive
  that lets super_admin act as any academy admin)
"""
import pytest
from httpx import Response

pytestmark = pytest.mark.security


# ─── Role gate ────────────────────────────────────────────────


def test_admin_cannot_access_saas_endpoints(admin_client):
    """Regular admin → 403 (only super_admin allowed)."""
    res = admin_client.get("/api/v1/saas/academies")
    assert res.status_code == 403


def test_coach_cannot_access_saas_endpoints(coach_client):
    res = coach_client.get("/api/v1/saas/academies")
    assert res.status_code == 403


def test_parent_cannot_access_saas_endpoints(parent_client):
    res = parent_client.get("/api/v1/saas/academies")
    assert res.status_code == 403


def test_unauthenticated_blocked(client):
    res = client.get("/api/v1/saas/academies")
    assert res.status_code == 401


def test_super_admin_can_access(super_admin_client, respx_mock):
    """super_admin role → reaches the endpoint (200 with mocked DB)."""
    # /academies fans out to academies + players + admins + coaches in parallel
    respx_mock.get(url__regex=r".*/rest/v1/academies.*").mock(
        return_value=Response(200, json=[])
    )
    respx_mock.get(url__regex=r".*/rest/v1/players.*").mock(
        return_value=Response(200, json=[])
    )
    respx_mock.get(url__regex=r".*/rest/v1/admins.*").mock(
        return_value=Response(200, json=[])
    )
    respx_mock.get(url__regex=r".*/rest/v1/coaches.*").mock(
        return_value=Response(200, json=[])
    )

    res = super_admin_client.get("/api/v1/saas/academies")
    assert res.status_code == 200


# ─── Delete academy (destructive) ─────────────────────────────


def test_delete_academy_404_when_not_found(super_admin_client, respx_mock):
    """Existence check first — returning empty list → 404, no cascade triggered."""
    respx_mock.get(url__regex=r".*/rest/v1/academies\?id=eq\.does-not-exist.*").mock(
        return_value=Response(200, json=[])
    )

    res = super_admin_client.delete("/api/v1/saas/academies/does-not-exist")
    assert res.status_code == 404


def test_delete_academy_cascade_succeeds(super_admin_client, respx_mock):
    """Existence check passes → cascade deletes from related tables → academy delete."""
    respx_mock.get(url__regex=r".*/rest/v1/academies\?id=eq\.acad-X.*").mock(
        return_value=Response(200, json=[{"id": "acad-X", "name": "Test"}])
    )

    # All cascade deletes return 204
    cascade_route = respx_mock.delete(
        url__regex=r".*/rest/v1/(players|coaches|admins|squads|notifications|payments_gateway)\?academy_id=eq\.acad-X"
    ).mock(return_value=Response(204))

    # Final academy delete
    final_delete = respx_mock.delete(
        url__regex=r".*/rest/v1/academies\?id=eq\.acad-X$"
    ).mock(return_value=Response(204))

    res = super_admin_client.delete("/api/v1/saas/academies/acad-X")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["deleted"] == "acad-X"
    # All 6 cascade tables hit
    assert cascade_route.call_count == 6
    assert final_delete.called


def test_delete_academy_500_when_final_delete_fails(super_admin_client, respx_mock):
    """If the final academy delete returns 4xx/5xx → 500 to caller."""
    respx_mock.get(url__regex=r".*/rest/v1/academies\?id=eq\.acad-Y.*").mock(
        return_value=Response(200, json=[{"id": "acad-Y", "name": "Test"}])
    )
    respx_mock.delete(
        url__regex=r".*/rest/v1/(players|coaches|admins|squads|notifications|payments_gateway)\?academy_id=eq\.acad-Y"
    ).mock(return_value=Response(204))
    respx_mock.delete(url__regex=r".*/rest/v1/academies\?id=eq\.acad-Y$").mock(
        return_value=Response(500, json={"error": "boom"})
    )

    res = super_admin_client.delete("/api/v1/saas/academies/acad-Y")
    assert res.status_code == 500


# ─── Bulk status update ───────────────────────────────────────


def test_bulk_status_rejects_invalid_status(super_admin_client):
    res = super_admin_client.patch(
        "/api/v1/saas/academies-bulk/status",
        json={"academy_ids": ["a1", "a2"], "status": "deleted"},
    )
    assert res.status_code == 400


def test_bulk_status_rejects_empty_list(super_admin_client):
    res = super_admin_client.patch(
        "/api/v1/saas/academies-bulk/status",
        json={"academy_ids": [], "status": "active"},
    )
    assert res.status_code == 400


def test_bulk_status_updates_all_succeed(super_admin_client, respx_mock):
    """All 3 patches succeed → updated=3, total=3."""
    respx_mock.patch(url__regex=r".*/rest/v1/academies\?id=eq\..*").mock(
        return_value=Response(204)
    )

    res = super_admin_client.patch(
        "/api/v1/saas/academies-bulk/status",
        json={"academy_ids": ["a1", "a2", "a3"], "status": "suspended"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["updated"] == 3
    assert body["total"] == 3


def test_bulk_status_partial_failure_reported(super_admin_client, respx_mock):
    """If 1 of 3 patches fails (5xx), report updated=2, total=3 — don't 500."""
    # First two succeed, third fails — respx routes by URL so we need per-id stubs
    respx_mock.patch(url__regex=r".*/rest/v1/academies\?id=eq\.a1$").mock(
        return_value=Response(204)
    )
    respx_mock.patch(url__regex=r".*/rest/v1/academies\?id=eq\.a2$").mock(
        return_value=Response(204)
    )
    respx_mock.patch(url__regex=r".*/rest/v1/academies\?id=eq\.a-fail$").mock(
        return_value=Response(500, json={"error": "boom"})
    )

    res = super_admin_client.patch(
        "/api/v1/saas/academies-bulk/status",
        json={"academy_ids": ["a1", "a2", "a-fail"], "status": "active"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["updated"] == 2
    assert body["total"] == 3


def test_bulk_status_validates_required_fields(super_admin_client):
    """Missing fields → 422."""
    res = super_admin_client.patch(
        "/api/v1/saas/academies-bulk/status", json={"academy_ids": ["a1"]}
    )
    assert res.status_code == 422


# ─── Impersonation (super_admin acting as academy admin) ──────


def test_impersonate_returns_academy_and_admin(super_admin_client, respx_mock):
    respx_mock.get(url__regex=r".*/rest/v1/academies\?id=eq\.acad-A.*").mock(
        return_value=Response(
            200,
            json=[{
                "id": "acad-A", "name": "Casablanca FC",
                "logo_url": "https://x/logo.png", "primary_color": "#1e40af",
            }],
        )
    )
    respx_mock.get(url__regex=r".*/rest/v1/admins\?academy_id=eq\.acad-A.*").mock(
        return_value=Response(
            200,
            json=[{
                "user_id": "admin-uuid", "email": "admin@casa.fc",
                "full_name": "Hassan Admin",
            }],
        )
    )

    res = super_admin_client.post("/api/v1/saas/impersonate/acad-A")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["academy"]["id"] == "acad-A"
    assert body["academy"]["name"] == "Casablanca FC"
    assert body["admin"]["email"] == "admin@casa.fc"


def test_impersonate_404_when_academy_missing(super_admin_client, respx_mock):
    respx_mock.get(url__regex=r".*/rest/v1/academies\?id=eq\.nope.*").mock(
        return_value=Response(200, json=[])
    )

    res = super_admin_client.post("/api/v1/saas/impersonate/nope")
    assert res.status_code == 404


def test_impersonate_returns_null_admin_when_none_assigned(super_admin_client, respx_mock):
    """Academy exists but has no admin assigned → admin=null, still 200."""
    respx_mock.get(url__regex=r".*/rest/v1/academies\?id=eq\.acad-no-admin.*").mock(
        return_value=Response(
            200,
            json=[{"id": "acad-no-admin", "name": "Empty Academy",
                   "logo_url": None, "primary_color": None}],
        )
    )
    respx_mock.get(url__regex=r".*/rest/v1/admins\?academy_id=eq\.acad-no-admin.*").mock(
        return_value=Response(200, json=[])
    )

    res = super_admin_client.post("/api/v1/saas/impersonate/acad-no-admin")
    assert res.status_code == 200
    assert res.json()["admin"] is None


@pytest.mark.security
def test_admin_cannot_impersonate(admin_client):
    """A regular admin must NOT be able to call impersonate — 403."""
    res = admin_client.post("/api/v1/saas/impersonate/any-academy")
    assert res.status_code == 403


@pytest.mark.security
def test_parent_cannot_delete_academy(parent_client):
    res = parent_client.delete("/api/v1/saas/academies/any-id")
    assert res.status_code == 403


@pytest.mark.security
def test_admin_cannot_bulk_update(admin_client):
    res = admin_client.patch(
        "/api/v1/saas/academies-bulk/status",
        json={"academy_ids": ["a1"], "status": "suspended"},
    )
    assert res.status_code == 403


# ─── Renewal reminders trigger ────────────────────────────────


def _academy(plan="pro", billing_start_offset_days=-25, name="Test FC", aid="acad-1"):
    """Build an academy record. billing_start_offset_days is days from today."""
    from datetime import date, timedelta
    start = date.today() + timedelta(days=billing_start_offset_days)
    return {
        "id": aid,
        "name": name,
        "plan_id": plan,
        "billing_cycle_start": start.isoformat(),
        "status": "active",
    }


def test_renewals_trigger_skips_free_plans(super_admin_client, respx_mock, mocker):
    """Free plans never trigger reminders even if 'due'."""
    respx_mock.get(url__regex=r".*/rest/v1/academies\?select=id,name,plan_id.*").mock(
        return_value=Response(200, json=[_academy(plan="free", billing_start_offset_days=-29)])
    )
    spy = mocker.patch("routers.saas_admin.send_renewal_reminder", return_value=True)

    res = super_admin_client.post("/api/v1/saas/renewals/trigger", json={"days_ahead": 7})
    assert res.status_code == 200
    body = res.json()
    assert body["due_soon"] == 0
    assert body["reminders_sent"] == 0
    spy.assert_not_called()


def test_renewals_trigger_skips_far_future(super_admin_client, respx_mock, mocker):
    """Renewal more than days_ahead away → not picked."""
    # billing_start 5 days ago → next renewal in 25 days; days_ahead=7 → skip
    respx_mock.get(url__regex=r".*/rest/v1/academies\?select=id,name,plan_id.*").mock(
        return_value=Response(200, json=[_academy(plan="pro", billing_start_offset_days=-5)])
    )
    spy = mocker.patch("routers.saas_admin.send_renewal_reminder", return_value=True)

    res = super_admin_client.post("/api/v1/saas/renewals/trigger", json={"days_ahead": 7})
    body = res.json()
    assert body["due_soon"] == 0
    spy.assert_not_called()


def test_renewals_trigger_picks_due_soon_and_sends_email(super_admin_client, respx_mock, mocker):
    """billing_start ~28 days ago → renewal in ~2 days → triggers email."""
    acc = _academy(plan="pro", billing_start_offset_days=-28, aid="acad-soon")
    respx_mock.get(url__regex=r".*/rest/v1/academies\?select=id,name,plan_id.*").mock(
        return_value=Response(200, json=[acc])
    )
    # Admin lookup with email
    respx_mock.get(url__regex=r".*/rest/v1/admins\?academy_id=eq\.acad-soon.*").mock(
        return_value=Response(200, json=[{"user_id": "admin-1", "email": "owner@academy.test"}])
    )
    # In-app notification create
    respx_mock.post(url__regex=r".*/rest/v1/notifications").mock(
        return_value=Response(201, json={})
    )

    spy = mocker.patch("routers.saas_admin.send_renewal_reminder", return_value=True)

    res = super_admin_client.post("/api/v1/saas/renewals/trigger", json={"days_ahead": 7})
    assert res.status_code == 200
    body = res.json()
    assert body["due_soon"] == 1
    assert body["reminders_sent"] == 1
    assert body["emails_sent"] == 1

    spy.assert_called_once()
    kw = spy.call_args.kwargs
    assert kw["to"] == "owner@academy.test"
    assert kw["academy_name"] == "Test FC"
    assert kw["plan_name"] == "pro"
    assert kw["amount"] == 499.0  # PLAN_PRICES["pro"]


def test_renewals_trigger_skips_email_when_admin_has_no_email(super_admin_client, respx_mock, mocker):
    acc = _academy(plan="pro", billing_start_offset_days=-28, aid="acad-no-email")
    respx_mock.get(url__regex=r".*/rest/v1/academies\?select=id,name,plan_id.*").mock(
        return_value=Response(200, json=[acc])
    )
    respx_mock.get(url__regex=r".*/rest/v1/admins\?academy_id=eq\.acad-no-email.*").mock(
        return_value=Response(200, json=[{"user_id": "admin-1"}])  # no email key
    )
    respx_mock.post(url__regex=r".*/rest/v1/notifications").mock(return_value=Response(201))

    spy = mocker.patch("routers.saas_admin.send_renewal_reminder", return_value=True)

    res = super_admin_client.post("/api/v1/saas/renewals/trigger", json={"days_ahead": 7})
    assert res.status_code == 200
    body = res.json()
    # In-app reminder still counts, but email did NOT go out
    assert body["reminders_sent"] == 1
    assert body["emails_sent"] == 0
    spy.assert_not_called()


def test_renewals_trigger_email_failure_does_not_break(super_admin_client, respx_mock, mocker):
    """Email failure must not crash the trigger or affect in-app counts."""
    acc = _academy(plan="pro", billing_start_offset_days=-28, aid="acad-mailfail")
    respx_mock.get(url__regex=r".*/rest/v1/academies\?select=id,name,plan_id.*").mock(
        return_value=Response(200, json=[acc])
    )
    respx_mock.get(url__regex=r".*/rest/v1/admins\?academy_id=eq\.acad-mailfail.*").mock(
        return_value=Response(200, json=[{"user_id": "admin-1", "email": "x@test.com"}])
    )
    respx_mock.post(url__regex=r".*/rest/v1/notifications").mock(return_value=Response(201))

    mocker.patch("routers.saas_admin.send_renewal_reminder", side_effect=Exception("SMTP boom"))

    res = super_admin_client.post("/api/v1/saas/renewals/trigger", json={"days_ahead": 7})
    assert res.status_code == 200
    body = res.json()
    assert body["reminders_sent"] == 1
    assert body["emails_sent"] == 0


def test_renewals_trigger_skips_suspended_academies(super_admin_client, respx_mock, mocker):
    """Suspended academies should not get renewal reminders.
    The Supabase query filters with status=neq.suspended, so respx returns nothing."""
    # The route URL contains status=neq.suspended — respx returns empty since "suspended" filtered out
    respx_mock.get(url__regex=r".*/rest/v1/academies\?select=id,name,plan_id.*").mock(
        return_value=Response(200, json=[])
    )
    spy = mocker.patch("routers.saas_admin.send_renewal_reminder", return_value=True)

    res = super_admin_client.post("/api/v1/saas/renewals/trigger", json={"days_ahead": 7})
    body = res.json()
    assert body["checked"] == 0
    assert body["due_soon"] == 0
    spy.assert_not_called()


@pytest.mark.security
def test_admin_cannot_trigger_renewals(admin_client):
    """Renewals trigger is super_admin only — admin gets 403."""
    res = admin_client.post("/api/v1/saas/renewals/trigger", json={"days_ahead": 7})
    assert res.status_code == 403

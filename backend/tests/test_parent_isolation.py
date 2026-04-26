"""
Security tests — verify a parent cannot access another family's data.

This is the most critical security boundary in the SaaS:
- Each parent must see ONLY their own children's data.
- Server-side enforcement via assert_parent_owns_player() and role/user_id checks.
- Client-side filtering is a fallback, not a guarantee.
"""
import pytest
from httpx import Response

pytestmark = pytest.mark.security


# ─── Direct unit tests on assert_parent_owns_player ──────────


@pytest.mark.asyncio
async def test_assert_parent_owns_player_allows_owner(respx_mock):
    """Parent owns the player → no exception raised."""
    from core.auth_middleware import assert_parent_owns_player

    respx_mock.get(
        url__regex=r".*/rest/v1/players\?parent_id=eq\.parent-1&user_id=eq\.player-1.*"
    ).mock(return_value=Response(200, json=[{"user_id": "player-1"}]))

    # Should not raise
    await assert_parent_owns_player("parent-1", "player-1")


@pytest.mark.asyncio
async def test_assert_parent_owns_player_blocks_stranger(respx_mock):
    """Parent has no link to player → 403."""
    from fastapi import HTTPException
    from core.auth_middleware import assert_parent_owns_player

    respx_mock.get(
        url__regex=r".*/rest/v1/players\?parent_id=eq\.parent-1&user_id=eq\.player-of-someone-else.*"
    ).mock(return_value=Response(200, json=[]))  # empty → not owner

    with pytest.raises(HTTPException) as exc:
        await assert_parent_owns_player("parent-1", "player-of-someone-else")
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_assert_parent_owns_player_db_failure_denies(respx_mock):
    """If DB returns error, fail-closed: deny access."""
    from fastapi import HTTPException
    from core.auth_middleware import assert_parent_owns_player

    respx_mock.get(url__regex=r".*/rest/v1/players.*").mock(
        return_value=Response(500, json={"error": "boom"})
    )

    with pytest.raises(HTTPException) as exc:
        await assert_parent_owns_player("parent-1", "player-1")
    assert exc.value.status_code == 403


# ─── End-to-end via API: GET /players/parent/{parent_id} ──────


def test_parent_cannot_view_other_parents_children(authed_as):
    """Parent A logged in → fetching parent B's children → 403."""
    with authed_as("parent", user_id="parent-A") as c:
        res = c.get("/api/v1/players/parent/parent-B")
        assert res.status_code == 403


def _fake_player(user_id="child-1", parent_id="parent-A", full_name="Mohamed"):
    """Build a complete player record matching PlayerResponse schema."""
    return {
        "user_id": user_id,
        "full_name": full_name,
        "parent_id": parent_id,
        "birth_date": "2010-05-15",
        "subscription_type": "Monthly",
        "u_category": "U15",
        "parent_name": "Parent One",
        "parent_whatsapp": "+212600000000",
        "account_status": "Active",
        "users": {"full_name": full_name},
    }


def test_parent_can_view_own_children(authed_as, respx_mock):
    """Parent fetching their OWN children → 200."""
    respx_mock.get(url__regex=r".*/rest/v1/players\?parent_id=eq\.parent-A.*").mock(
        return_value=Response(200, json=[_fake_player()])
    )

    with authed_as("parent", user_id="parent-A") as c:
        res = c.get("/api/v1/players/parent/parent-A")
        assert res.status_code == 200
        body = res.json()
        assert isinstance(body, list)
        assert body[0]["full_name"] == "Mohamed"


def test_admin_can_view_any_parents_children(authed_as, respx_mock):
    """Admin fetching any parent's children → 200 (override allowed)."""
    respx_mock.get(url__regex=r".*/rest/v1/players\?parent_id=eq\.parent-X.*").mock(
        return_value=Response(200, json=[])
    )

    with authed_as("admin", user_id="admin-1") as c:
        res = c.get("/api/v1/players/parent/parent-X")
        assert res.status_code == 200


# ─── Players list endpoint requires admin/coach role ─────────


def test_parent_cannot_list_all_players(parent_client):
    """GET /players (list everything) is admin/coach only — parent gets 403."""
    res = parent_client.get("/api/v1/players/")
    assert res.status_code == 403


def test_admin_can_list_all_players(admin_client, mocker):
    async def fake_get_players():
        return [_fake_player(user_id="p1", full_name="Player One")]

    mocker.patch("services.supabase_client.supabase.get_players", side_effect=fake_get_players)

    res = admin_client.get("/api/v1/players/")
    assert res.status_code == 200


# ─── Payments / finances isolation ────────────────────────────


def test_parent_cannot_view_other_players_payments(authed_as, respx_mock):
    """Parent fetching payments for a player they don't own → 403."""
    respx_mock.get(
        url__regex=r".*/rest/v1/players\?parent_id=eq\.parent-A&user_id=eq\.foreign-player.*"
    ).mock(return_value=Response(200, json=[]))  # not owner

    with authed_as("parent", user_id="parent-A") as c:
        res = c.get("/api/v1/finances/payments/player/foreign-player")
        assert res.status_code == 403


def test_parent_cannot_view_other_users_payments(authed_as, respx_mock):
    """Parent fetching another user's payment list → 403."""
    # The endpoint checks if target user_id is one of parent's children
    respx_mock.get(
        url__regex=r".*/rest/v1/players\?parent_id=eq\.parent-A&user_id=eq\.stranger.*"
    ).mock(return_value=Response(200, json=[]))  # not a child

    with authed_as("parent", user_id="parent-A") as c:
        res = c.get("/api/v1/finances/payments/user/stranger")
        assert res.status_code == 403


# ─── Attendance isolation ─────────────────────────────────────


def test_parent_cannot_view_other_players_attendance(authed_as, respx_mock):
    respx_mock.get(
        url__regex=r".*/rest/v1/players\?parent_id=eq\.parent-A&user_id=eq\.foreign-player.*"
    ).mock(return_value=Response(200, json=[]))

    with authed_as("parent", user_id="parent-A") as c:
        res = c.get("/api/v1/attendance/player/foreign-player")
        assert res.status_code == 403


# ─── Unauthenticated requests are blocked ─────────────────────


def test_unauthenticated_player_list_blocked(client):
    """No token → 401."""
    res = client.get("/api/v1/players/")
    assert res.status_code == 401


def test_unauthenticated_player_create_blocked(client):
    res = client.post("/api/v1/players/", json={})
    assert res.status_code == 401


# ─── Role gates on mutating endpoints ─────────────────────────


def test_coach_cannot_create_player(coach_client):
    """Player creation is admin/super_admin only — coach is forbidden."""
    payload = {
        "user_id": "new-player",
        "birth_date": "2010-01-01",
        "subscription_type": "Free",
        "u_category": "U15",
        "parent_name": "Ali",
        "parent_whatsapp": "+212600000000",
    }
    res = coach_client.post("/api/v1/players/", json=payload)
    assert res.status_code == 403


def test_parent_cannot_create_player(parent_client):
    payload = {
        "user_id": "new-player",
        "birth_date": "2010-01-01",
        "subscription_type": "Free",
        "u_category": "U15",
        "parent_name": "Ali",
        "parent_whatsapp": "+212600000000",
    }
    res = parent_client.post("/api/v1/players/", json=payload)
    assert res.status_code == 403


def test_parent_cannot_delete_player(parent_client):
    res = parent_client.delete("/api/v1/players/some-player-id")
    assert res.status_code == 403

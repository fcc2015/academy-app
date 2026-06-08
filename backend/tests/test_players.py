"""
tests/test_players.py — Player CRUD, duplicate detection, photo upload, error handling

Coverage targets: players.py 32% → 70%+
Focus areas:
  - CRUD: create (with user insert + notification), update, delete
  - Duplicate player detection (name match via Supabase REST)
  - Photo upload validation (type, size)
  - Error handling (500, 409, 404)
  - Role gates
"""
from unittest.mock import AsyncMock, MagicMock
from io import BytesIO


# Minimal valid payload matching PlayerCreate schema
VALID_PLAYER = {
    "user_id": "player-uuid-1",
    "full_name": "Youssef Amrani",
    "birth_date": "2015-03-10",
    "subscription_type": "Monthly",
    "u_category": "U12",
    "parent_name": "Hassan Amrani",
    "parent_whatsapp": "+212612345678",
}

VALID_PLAYER_RESPONSE = {
    **VALID_PLAYER,
    "technical_level": "B",
    "discount_type": None,
    "discount_value": None,
    "address": None,
    "account_status": "Pending",
    "photo_url": None,
    "parent_id": None,
    "blood_type": None,
    "medical_cert_valid_until": None,
    "transport_zone": None,
    "allergies": None,
    "emergency_contact": None,
    "created_at": None,
}


# =========================================================
# CREATE PLAYER
# =========================================================

class TestCreatePlayer:
    """POST /players/ — admin creates player."""

    def test_create_player_success(self, admin_client, mocker, respx_mock):
        from core.config import settings

        # Mock duplicate check (no match)
        respx_mock.get(f"{settings.SUPABASE_URL}/rest/v1/users").respond(200, json=[])
        mocker.patch("routers.players.supabase.insert_user", new_callable=AsyncMock)
        mocker.patch(
            "routers.players.supabase.insert_player",
            new_callable=AsyncMock,
            return_value=[{k: v for k, v in VALID_PLAYER_RESPONSE.items() if k != "full_name"}],
        )
        mocker.patch("routers.players.supabase.insert_notification", new_callable=AsyncMock)

        r = admin_client.post("/api/v1/players/", json=VALID_PLAYER)
        assert r.status_code == 200
        assert r.json()["full_name"] == "Youssef Amrani"

    def test_create_player_duplicate_name_blocked(self, admin_client, mocker, respx_mock):
        from core.config import settings

        # Duplicate check returns a match
        respx_mock.get(f"{settings.SUPABASE_URL}/rest/v1/users").respond(200, json=[{"id": "existing"}])

        r = admin_client.post("/api/v1/players/", json=VALID_PLAYER)
        assert r.status_code == 409
        assert "already exists" in r.json()["detail"]

    def test_create_player_duplicate_check_failure_non_blocking(self, admin_client, mocker, respx_mock):
        """If the duplicate check itself fails, player creation should still proceed."""
        from core.config import settings

        respx_mock.get(f"{settings.SUPABASE_URL}/rest/v1/users").respond(500)
        mocker.patch("routers.players.supabase.insert_user", new_callable=AsyncMock)
        mocker.patch(
            "routers.players.supabase.insert_player",
            new_callable=AsyncMock,
            return_value=[{k: v for k, v in VALID_PLAYER_RESPONSE.items() if k != "full_name"}],
        )
        mocker.patch("routers.players.supabase.insert_notification", new_callable=AsyncMock)

        r = admin_client.post("/api/v1/players/", json=VALID_PLAYER)
        assert r.status_code == 200

    def test_create_player_user_already_exists_continues(self, admin_client, mocker, respx_mock):
        """If insert_user fails with 'duplicate', creation still proceeds."""
        from core.config import settings

        respx_mock.get(f"{settings.SUPABASE_URL}/rest/v1/users").respond(200, json=[])
        mocker.patch(
            "routers.players.supabase.insert_user",
            new_callable=AsyncMock,
            side_effect=Exception("duplicate key value violates unique constraint"),
        )
        mocker.patch(
            "routers.players.supabase.insert_player",
            new_callable=AsyncMock,
            return_value=[{k: v for k, v in VALID_PLAYER_RESPONSE.items() if k != "full_name"}],
        )
        mocker.patch("routers.players.supabase.insert_notification", new_callable=AsyncMock)

        r = admin_client.post("/api/v1/players/", json=VALID_PLAYER)
        assert r.status_code == 200

    def test_create_player_insert_fails_500(self, admin_client, mocker, respx_mock):
        from core.config import settings

        respx_mock.get(f"{settings.SUPABASE_URL}/rest/v1/users").respond(200, json=[])
        mocker.patch("routers.players.supabase.insert_user", new_callable=AsyncMock)
        mocker.patch(
            "routers.players.supabase.insert_player",
            new_callable=AsyncMock,
            side_effect=Exception("DB connection lost"),
        )

        r = admin_client.post("/api/v1/players/", json=VALID_PLAYER)
        assert r.status_code == 500

    def test_create_player_notification_failure_non_blocking(self, admin_client, mocker, respx_mock):
        from core.config import settings

        respx_mock.get(f"{settings.SUPABASE_URL}/rest/v1/users").respond(200, json=[])
        mocker.patch("routers.players.supabase.insert_user", new_callable=AsyncMock)
        mocker.patch(
            "routers.players.supabase.insert_player",
            new_callable=AsyncMock,
            return_value=[{k: v for k, v in VALID_PLAYER_RESPONSE.items() if k != "full_name"}],
        )
        mocker.patch(
            "routers.players.supabase.insert_notification",
            new_callable=AsyncMock,
            side_effect=Exception("notification service down"),
        )

        r = admin_client.post("/api/v1/players/", json=VALID_PLAYER)
        assert r.status_code == 200

    def test_create_player_strips_html_from_name(self, admin_client, mocker, respx_mock):
        from core.config import settings

        respx_mock.get(f"{settings.SUPABASE_URL}/rest/v1/users").respond(200, json=[])
        mocker.patch("routers.players.supabase.insert_user", new_callable=AsyncMock)
        mock_insert = mocker.patch(
            "routers.players.supabase.insert_player",
            new_callable=AsyncMock,
            return_value=[{k: v for k, v in VALID_PLAYER_RESPONSE.items() if k != "full_name"}],
        )
        mocker.patch("routers.players.supabase.insert_notification", new_callable=AsyncMock)

        payload = {**VALID_PLAYER, "full_name": "<b>XSS</b> Player"}
        r = admin_client.post("/api/v1/players/", json=payload)
        assert r.status_code == 200
        assert r.json()["full_name"] == "XSS Player"


# =========================================================
# UPDATE PLAYER
# =========================================================

class TestUpdatePlayer:
    """PUT /players/{user_id}"""

    def test_update_player_success(self, admin_client, mocker):
        mocker.patch("routers.players.supabase._get", new_callable=AsyncMock, return_value=[{"parent_id": None}])
        mocker.patch(
            "routers.players.supabase.update_player",
            new_callable=AsyncMock,
            return_value=[{k: v for k, v in VALID_PLAYER_RESPONSE.items() if k != "full_name"}],
        )

        r = admin_client.put("/api/v1/players/player-uuid-1", json=VALID_PLAYER)
        assert r.status_code == 200
        assert r.json()["full_name"] == "Youssef Amrani"

    def test_update_player_not_found(self, admin_client, mocker):
        mocker.patch("routers.players.supabase._get", new_callable=AsyncMock, return_value=[{"parent_id": None}])
        mocker.patch("routers.players.supabase.update_player", new_callable=AsyncMock, return_value=[])

        r = admin_client.put("/api/v1/players/nonexistent", json=VALID_PLAYER)
        assert r.status_code == 404

    def test_update_player_db_error_500(self, admin_client, mocker):
        mocker.patch("routers.players.supabase._get", new_callable=AsyncMock, return_value=[{"parent_id": None}])
        mocker.patch(
            "routers.players.supabase.update_player",
            new_callable=AsyncMock,
            side_effect=Exception("connection timeout"),
        )

        r = admin_client.put("/api/v1/players/player-1", json=VALID_PLAYER)
        assert r.status_code == 500


# =========================================================
# DELETE PLAYER
# =========================================================

class TestDeletePlayer:
    """DELETE /players/{user_id}"""

    def test_delete_player_success(self, admin_client, mocker):
        mocker.patch("routers.players.supabase.delete_player", new_callable=AsyncMock)

        r = admin_client.delete("/api/v1/players/player-uuid-1")
        assert r.status_code == 200
        assert "deleted successfully" in r.json()["message"]

    def test_delete_player_db_error_500(self, admin_client, mocker):
        mocker.patch(
            "routers.players.supabase.delete_player",
            new_callable=AsyncMock,
            side_effect=Exception("FK constraint"),
        )

        r = admin_client.delete("/api/v1/players/player-uuid-1")
        assert r.status_code == 500


# =========================================================
# LIST ALL PLAYERS
# =========================================================

class TestListPlayers:
    """GET /players/"""

    def test_list_players_adds_full_name_from_users_join(self, admin_client, mocker):
        mocker.patch("routers.players.supabase.get_players", new_callable=AsyncMock, return_value=[
            {**VALID_PLAYER_RESPONSE, "full_name": None, "users": {"full_name": "Joined Name"}},
        ])

        r = admin_client.get("/api/v1/players/")
        assert r.status_code == 200
        assert r.json()[0]["full_name"] == "Joined Name"

    def test_list_players_uses_existing_full_name(self, admin_client, mocker):
        mocker.patch("routers.players.supabase.get_players", new_callable=AsyncMock, return_value=[
            {**VALID_PLAYER_RESPONSE, "full_name": "Direct Name"},
        ])

        r = admin_client.get("/api/v1/players/")
        assert r.status_code == 200
        assert r.json()[0]["full_name"] == "Direct Name"

    def test_list_players_db_error_500(self, admin_client, mocker):
        mocker.patch(
            "routers.players.supabase.get_players",
            new_callable=AsyncMock,
            side_effect=Exception("timeout"),
        )

        r = admin_client.get("/api/v1/players/")
        assert r.status_code == 500


# =========================================================
# PHOTO UPLOAD
# =========================================================

class TestPhotoUpload:
    """POST /players/upload-photo"""

    def test_rejects_non_image(self, admin_client):
        r = admin_client.post(
            "/api/v1/players/upload-photo",
            files={"file": ("doc.pdf", b"fake content", "application/pdf")},
        )
        assert r.status_code == 400
        assert "image" in r.json()["detail"].lower()

    def test_rejects_oversized_image(self, admin_client):
        big_content = b"\x00" * (3 * 1024 * 1024)  # 3 MB
        r = admin_client.post(
            "/api/v1/players/upload-photo",
            files={"file": ("big.jpg", big_content, "image/jpeg")},
        )
        assert r.status_code == 400
        assert "2 MB" in r.json()["detail"]

    def test_upload_success(self, admin_client, respx_mock):
        from core.config import settings
        import re

        respx_mock.post(re.compile(f"{settings.SUPABASE_URL}/storage/v1/object/player-photos/")).respond(201, json={})

        small_img = b"\xff\xd8\xff" + b"\x00" * 1000  # Fake JPEG
        r = admin_client.post(
            "/api/v1/players/upload-photo",
            files={"file": ("player.jpg", small_img, "image/jpeg")},
        )
        assert r.status_code == 200
        assert "url" in r.json()
        assert "player-photos" in r.json()["url"]

    def test_upload_storage_failure_500(self, admin_client, respx_mock):
        from core.config import settings
        import re

        respx_mock.post(re.compile(f"{settings.SUPABASE_URL}/storage/v1/object/player-photos/")).respond(403, json={"error": "forbidden"})

        small_img = b"\xff\xd8\xff" + b"\x00" * 500
        r = admin_client.post(
            "/api/v1/players/upload-photo",
            files={"file": ("player.jpg", small_img, "image/jpeg")},
        )
        assert r.status_code == 500


# =========================================================
# ROLE GATES (complementing test_parent_isolation.py)
# =========================================================

class TestPlayerRoleGates:
    """Additional role checks not covered by parent_isolation tests."""

    def test_coach_cannot_create_player(self, authed_as):
        with authed_as("coach", user_id="coach-1") as c:
            r = c.post("/api/v1/players/", json=VALID_PLAYER)
            assert r.status_code == 403

    def test_coach_cannot_update_player(self, authed_as):
        with authed_as("coach", user_id="coach-1") as c:
            r = c.put("/api/v1/players/player-1", json=VALID_PLAYER)
            assert r.status_code == 403

    def test_coach_cannot_delete_player(self, authed_as):
        with authed_as("coach", user_id="coach-1") as c:
            r = c.delete("/api/v1/players/player-1")
            assert r.status_code == 403

    def test_parent_cannot_upload_photo(self, parent_client):
        r = parent_client.post(
            "/api/v1/players/upload-photo",
            files={"file": ("x.jpg", b"\xff", "image/jpeg")},
        )
        assert r.status_code == 403


# =========================================================
# PLAYER STREAKS & LEADERBOARD
# =========================================================

class TestPlayerStreaks:
    """GET /players/{player_id}/streak and /players/streaks/leaderboard"""

    def test_get_player_streak_success(self, admin_client, mocker):
        attendance_mock = [
            {"date": "2026-06-08", "status": "present"},
            {"date": "2026-06-07", "status": "present"},
            {"date": "2026-06-06", "status": "present"},
            {"date": "2026-06-05", "status": "present"},
            {"date": "2026-06-04", "status": "present"}, # streak = 5 -> Bronze
            {"date": "2026-06-03", "status": "absent"},
            {"date": "2026-06-02", "status": "present"},
        ]
        mocker.patch(
            "routers.players.supabase.get_player_attendance",
            new_callable=AsyncMock,
            return_value=attendance_mock,
        )

        r = admin_client.get("/api/v1/players/player-1/streak")
        assert r.status_code == 200
        data = r.json()
        assert data["current_streak"] == 5
        assert data["longest_streak"] == 5
        assert data["reward_tier"] == "Bronze"
        assert data["reward_label"] == "🥉 Bronze"
        assert data["next_milestone"] == 10
        assert data["sessions_to_next"] == 5
        assert data["total_present"] == 6
        assert data["total_sessions"] == 7
        assert data["attendance_rate"] == 85.7

    def test_get_player_streak_empty_records(self, admin_client, mocker):
        mocker.patch(
            "routers.players.supabase.get_player_attendance",
            new_callable=AsyncMock,
            return_value=[],
        )

        r = admin_client.get("/api/v1/players/player-1/streak")
        assert r.status_code == 200
        data = r.json()
        assert data["current_streak"] == 0
        assert data["longest_streak"] == 0
        assert data["reward_tier"] is None
        assert data["next_milestone"] == 5

    def test_get_player_streak_db_error(self, admin_client, mocker):
        mocker.patch(
            "routers.players.supabase.get_player_attendance",
            new_callable=AsyncMock,
            side_effect=Exception("Database failure"),
        )

        r = admin_client.get("/api/v1/players/player-1/streak")
        assert r.status_code == 500

    def test_get_leaderboard_success(self, admin_client, mocker):
        attendance_mock = [
            {"player_id": "p1", "status": "present", "date": "2026-06-08"},
            {"player_id": "p1", "status": "present", "date": "2026-06-07"},
            {"player_id": "p2", "status": "present", "date": "2026-06-08"},
        ]
        players_mock = [
            {"user_id": "p1", "full_name": "Player One", "u_category": "U12"},
            {"user_id": "p2", "full_name": "Player Two", "u_category": "U14"},
        ]

        async def mock_get(path):
            if "attendance" in path:
                return attendance_mock
            if "players" in path:
                return players_mock
            return []

        mocker.patch("routers.players.supabase._get", new_callable=AsyncMock, side_effect=mock_get)

        r = admin_client.get("/api/v1/players/streaks/leaderboard")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2
        assert data[0]["player_id"] == "p1"
        assert data[0]["current_streak"] == 2
        assert data[0]["name"] == "Player One"
        assert data[1]["player_id"] == "p2"
        assert data[1]["current_streak"] == 1

    def test_get_leaderboard_role_gate(self, parent_client):
        # Parents should not access leaderboard
        r = parent_client.get("/api/v1/players/streaks/leaderboard")
        assert r.status_code == 403


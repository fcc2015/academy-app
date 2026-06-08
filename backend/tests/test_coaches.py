"""
tests/test_coaches.py — Unit tests for coach metrics API.
"""
from unittest.mock import AsyncMock
import pytest
import re


class TestCoachMetrics:
    """GET /coaches/{coach_id}/metrics"""

    def test_get_coach_metrics_success(self, admin_client, mocker, respx_mock):
        from core.config import settings

        coach_id = "coach-123"

        # 1. Mock the first two calls to supabase._get (coach profile and squads)
        coach_profile = [{
            "id": coach_id,
            "full_name": "Coach Reda",
            "specialization": "Technical",
            "status": "Active",
            "u_category": "U12",
            "photo_url": "http://example.com/photo.jpg"
        }]
        squads = [
            {"id": "squad-1", "name": "Squad A", "u_category": "U12"},
            {"id": "squad-2", "name": "Squad B", "u_category": "U12"}
        ]

        async def mock_get(path):
            if f"coaches?id=eq.{coach_id}" in path:
                return coach_profile
            if f"squads?coach_id=eq.{coach_id}" in path:
                return squads
            return []

        mocker.patch("routers.coaches.supabase._get", new_callable=AsyncMock, side_effect=mock_get)

        # 2. Mock the parallel httpx calls intercepted by respx_mock
        attendance_mock = [
            {"player_id": "p1", "status": "present", "date": "2026-06-08", "squad_id": "squad-1"},
            {"player_id": "p1", "status": "present", "date": "2026-06-07", "squad_id": "squad-1"},
            {"player_id": "p2", "status": "absent", "date": "2026-06-08", "squad_id": "squad-2"},
        ]
        players_mock = [
            {"user_id": "p1", "full_name": "Player One", "account_status": "Active"},
            {"user_id": "p2", "full_name": "Player Two", "account_status": "Active"},
        ]
        evaluations_mock = [
            {"player_id": "p1", "overall_score": 8.5, "created_at": "2026-06-08T10:00:00Z", "players": {"full_name": "Player One"}},
            {"player_id": "p2", "overall_score": 6.0, "created_at": "2026-06-07T10:00:00Z", "players": {"full_name": "Player Two"}},
        ]

        # Intercept parallel GET calls
        respx_mock.get(re.compile(f"{settings.SUPABASE_URL}/rest/v1/attendance.*")).respond(200, json=attendance_mock)
        respx_mock.get(re.compile(f"{settings.SUPABASE_URL}/rest/v1/players.*")).respond(200, json=players_mock)
        respx_mock.get(re.compile(f"{settings.SUPABASE_URL}/rest/v1/evaluations.*")).respond(200, json=evaluations_mock)

        r = admin_client.get(f"/api/v1/coaches/{coach_id}/metrics")
        assert r.status_code == 200

        data = r.json()
        assert data["coach"]["full_name"] == "Coach Reda"
        assert len(data["squads"]) == 2
        assert data["players_count"] == 2
        assert data["active_players_count"] == 2
        assert data["sessions_count"] == 2
        assert data["attendance_rate"] == 66.7
        assert data["avg_evaluation_score"] == 7.2
        assert len(data["top_players"]) == 2
        assert data["top_players"][0]["player_id"] == "p1"
        assert data["top_players"][0]["present"] == 2
        assert len(data["recent_evaluations"]) == 2

    def test_get_coach_metrics_not_found(self, admin_client, mocker):
        # Coach profile is empty
        mocker.patch(
            "routers.coaches.supabase._get",
            new_callable=AsyncMock,
            return_value=[]
        )

        r = admin_client.get("/api/v1/coaches/invalid-coach/metrics")
        assert r.status_code == 404
        assert "Coach not found" in r.json()["detail"]

    def test_get_coach_metrics_no_squads_or_category(self, admin_client, mocker, respx_mock):
        from core.config import settings

        coach_id = "coach-empty"
        coach_profile = [{
            "id": coach_id,
            "full_name": "Coach NoSquads",
            "specialization": "Technical",
            "status": "Active",
            "u_category": None,
            "photo_url": None
        }]

        async def mock_get(path):
            if f"coaches?id=eq.{coach_id}" in path:
                return coach_profile
            if f"squads?coach_id=eq.{coach_id}" in path:
                return []
            return []

        mocker.patch("routers.coaches.supabase._get", new_callable=AsyncMock, side_effect=mock_get)

        respx_mock.get(re.compile(f"{settings.SUPABASE_URL}/rest/v1/attendance.*")).respond(200, json=[])
        respx_mock.get(re.compile(f"{settings.SUPABASE_URL}/rest/v1/players.*")).respond(200, json=[])
        respx_mock.get(re.compile(f"{settings.SUPABASE_URL}/rest/v1/evaluations.*")).respond(200, json=[])

        r = admin_client.get(f"/api/v1/coaches/{coach_id}/metrics")
        assert r.status_code == 200
        data = r.json()
        assert data["coach"]["full_name"] == "Coach NoSquads"
        assert data["players_count"] == 0
        assert data["sessions_count"] == 0
        assert data["attendance_rate"] == 0
        assert data["avg_evaluation_score"] is None

    def test_get_coach_metrics_internal_error_masked(self, admin_client, mocker):
        # Database query raises exception
        mocker.patch(
            "routers.coaches.supabase._get",
            new_callable=AsyncMock,
            side_effect=Exception("Timeout")
        )

        r = admin_client.get("/api/v1/coaches/coach-1/metrics")
        assert r.status_code == 500
        assert "internal error occurred" in r.json()["detail"]

    def test_get_coach_metrics_role_gate(self, parent_client):
        # Parent role is not allowed to view coach metrics
        r = parent_client.get("/api/v1/coaches/coach-1/metrics")
        assert r.status_code == 403

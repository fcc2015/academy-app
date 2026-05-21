import pytest
import re
from httpx import Response
from core.config import settings

def test_analytics_overview_unauthorized(client):
    """Test that unauthorized users cannot access analytics."""
    res = client.get("/api/v1/analytics/overview")
    assert res.status_code == 401

def test_analytics_overview_authorized_admin(admin_client, respx_mock):
    """Test that an admin can fetch the analytics overview successfully with mocked DB data."""
    # 1. Mock the Supabase API calls using regex to match query parameters robustly
    respx_mock.get(re.compile(rf"{settings.SUPABASE_URL}/rest/v1/payments.*")).mock(
        return_value=Response(200, json=[
            {"id": 1, "amount": 100, "status": "paid", "payment_method": "Cash", "payment_date": "2026-05-15T10:00:00Z", "created_at": "2026-05-15T10:00:00Z"},
            {"id": 2, "amount": 200, "status": "paid", "payment_method": "Transfer", "payment_date": "2026-04-10T10:00:00Z", "created_at": "2026-04-10T10:00:00Z"},
            {"id": 3, "amount": 50, "status": "pending", "payment_method": "Cash", "payment_date": "2026-05-20T10:00:00Z", "created_at": "2026-05-20T10:00:00Z"}
        ])
    )
    respx_mock.get(re.compile(rf"{settings.SUPABASE_URL}/rest/v1/players.*")).mock(
        return_value=Response(200, json=[
            {"id": "p1", "full_name": "Player One", "u_category": "U15", "created_at": "2026-05-01T10:00:00Z"},
            {"id": "p2", "full_name": "Player Two", "u_category": "U17", "created_at": "2026-04-01T10:00:00Z"}
        ])
    )
    respx_mock.get(re.compile(rf"{settings.SUPABASE_URL}/rest/v1/attendance.*")).mock(
        return_value=Response(200, json=[
            {"player_id": "p1", "status": "Present", "date": "2026-05-10"},
            {"player_id": "p1", "status": "Present", "date": "2026-05-12"},
            {"player_id": "p2", "status": "Absent", "date": "2026-05-10"}
        ])
    )
    respx_mock.get(re.compile(rf"{settings.SUPABASE_URL}/rest/v1/evaluations.*")).mock(
        return_value=Response(200, json=[
            {"player_id": "p1", "overall_score": 8.5, "created_at": "2026-05-15T12:00:00Z", "players": {"full_name": "Player One"}},
            {"player_id": "p2", "overall_score": 7.0, "created_at": "2026-05-16T12:00:00Z", "players": {"full_name": "Player Two"}}
        ])
    )
    respx_mock.get(re.compile(rf"{settings.SUPABASE_URL}/rest/v1/expenses.*")).mock(
        return_value=Response(200, json=[
            {"amount": 150, "category": "General", "date": "2026-05-05", "created_at": "2026-05-05T00:00:00Z"}
        ])
    )
    respx_mock.get(re.compile(rf"{settings.SUPABASE_URL}/rest/v1/coaches.*")).mock(
        return_value=Response(200, json=[
            {"id": "c1", "status": "Active"}
        ])
    )
    respx_mock.get(re.compile(rf"{settings.SUPABASE_URL}/rest/v1/subscriptions.*")).mock(
        return_value=Response(200, json=[
            {"id": "s1", "status": "active", "monthly_amount": 300, "annual_amount": None, "billing_type": "monthly", "created_at": "2026-05-01T00:00:00Z"}
        ])
    )

    # 2. Call the endpoint
    res = admin_client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    
    # 3. Assert on summary metrics
    body = res.json()
    assert "summary" in body
    summary = body["summary"]
    assert summary["total_players"] == 2
    assert summary["total_revenue"] == 300 # 100 + 200 (status=paid)
    assert summary["active_coaches"] == 1
    assert summary["active_subscriptions"] == 1
    assert summary["total_payments"] == 3
    assert summary["total_evaluations"] == 2

    # 4. Assert on trends
    assert "revenue_trend" in body
    assert "players_trend" in body
    assert "payment_methods" in body
    assert "payment_statuses" in body
    assert "attendance_trend" in body
    assert "top_players_attendance" in body
    assert "age_categories" in body
    assert "evaluation_trend" in body
    assert "expense_trend" in body
    assert "expense_categories" in body

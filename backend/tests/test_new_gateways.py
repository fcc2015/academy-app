"""
Tests for payment gateways (Wafacash, CashPlus) and Advanced Player Features.
"""
import pytest
from httpx import Response

# ─── Moroccan Cash Gateway Tests ────────────────────────────────────

def test_generate_cash_payment_code_wafacash(admin_client, respx_mock):
    """Generate a Wafacash payment code successfully."""
    db_route = respx_mock.post(url__regex=r".*/rest/v1/payment_transactions").mock(
        return_value=Response(201, json={})
    )

    res = admin_client.post(
        "/api/v1/payments/gateway/cash/generate-code",
        json={
            "academy_id": "academy-1",
            "plan_id": "premium",
            "amount": 250.0,
            "provider": "wafacash"
        }
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["provider"] == "WAFACASH"
    assert body["payment_code"].startswith("WC-")
    assert body["amount"] == 250.0
    assert "Veuillez vous rendre dans une agence" in body["instructions"]
    assert db_route.called

def test_generate_cash_payment_code_cashplus(admin_client, respx_mock):
    """Generate a CashPlus payment code successfully."""
    db_route = respx_mock.post(url__regex=r".*/rest/v1/payment_transactions").mock(
        return_value=Response(201, json={})
    )

    res = admin_client.post(
        "/api/v1/payments/gateway/cash/generate-code",
        json={
            "academy_id": "academy-1",
            "plan_id": "premium",
            "amount": 250.0,
            "provider": "cashplus"
        }
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["provider"] == "CASHPLUS"
    assert body["payment_code"].startswith("CP-")
    assert db_route.called

def test_confirm_cash_deposit_success(admin_client, respx_mock):
    """Confirm cash deposit with reference proof successfully."""
    # Mock transaction lookup
    db_get_route = respx_mock.get(url__regex=r".*/rest/v1/payment_transactions\?paypal_order_id=eq\.WC-123456.*").mock(
        return_value=Response(200, json=[{
            "paypal_order_id": "WC-123456",
            "academy_id": "academy-1",
            "plan_id": "premium",
            "amount": 250.0,
            "status": "waiting_deposit",
            "paypal_capture_id": "WAFACASH"
        }])
    )
    # Mock transaction status patch
    db_patch_route = respx_mock.patch(url__regex=r".*/rest/v1/payment_transactions\?paypal_order_id=eq\.WC-123456.*").mock(
        return_value=Response(200, json=[{}])
    )
    # Mock academy subscription activation patch
    db_academy_route = respx_mock.patch(url__regex=r".*/rest/v1/academies\?id=eq\.academy-1.*").mock(
        return_value=Response(200, json=[{}])
    )

    res = admin_client.post(
        "/api/v1/payments/gateway/cash/confirm-deposit",
        json={
            "transaction_id": "WC-123456",
            "deposit_proof_reference": "PROOF-987654"
        }
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "confirmed successfully" in body["message"]
    assert db_get_route.called
    assert db_patch_route.called
    assert db_academy_route.called

# ─── Player Advanced Features Tests ──────────────────────────────────

def test_record_player_transfer_success(admin_client, respx_mock):
    """Log a player transfer to another club successfully."""
    # Mock player retrieval
    db_get_player = respx_mock.get(url__regex=r".*/rest/v1/players\?user_id=eq\.player-1.*").mock(
        return_value=Response(200, json=[{
            "user_id": "player-1",
            "full_name": "Rachid El Mourabit",
            "account_status": "Active"
        }])
    )
    # Mock logging in player_transfers table
    db_post_transfer = respx_mock.post(url__regex=r".*/rest/v1/player_transfers").mock(
        return_value=Response(201, json={})
    )
    # Mock updating player status to Suspended
    db_patch_player = respx_mock.patch(url__regex=r".*/rest/v1/players\?user_id=eq\.player-1.*").mock(
        return_value=Response(200, json=[{}])
    )

    res = admin_client.post(
        "/api/v1/players/player-1/transfer",
        json={
            "destination_club": "Wydad AC",
            "transfer_fee": 15000.0,
            "departure_reason": "Career advancement",
            "transfer_date": "2026-06-01"
        }
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "logged successfully" in body["message"]
    assert db_get_player.called
    assert db_post_transfer.called
    assert db_patch_player.called

def test_record_player_transfer_table_missing_fallback(admin_client, respx_mock):
    """Log a player transfer successfully using note fallback if table doesn't exist."""
    # Mock player retrieval
    db_get_player = respx_mock.get(url__regex=r".*/rest/v1/players\?user_id=eq\.player-1.*").mock(
        return_value=Response(200, json=[{
            "user_id": "player-1",
            "full_name": "Rachid El Mourabit",
            "account_status": "Active",
            "notes": "Good player."
        }])
    )
    # Mock player transfers insert failing (table missing)
    db_post_transfer = respx_mock.post(url__regex=r".*/rest/v1/player_transfers").mock(
        return_value=Response(400, text="relation player_transfers does not exist")
    )
    # Mock fallback to player notes updating and suspending account
    db_patch_player = respx_mock.patch(url__regex=r".*/rest/v1/players\?user_id=eq\.player-1.*").mock(
        return_value=Response(200, json=[{}])
    )

    res = admin_client.post(
        "/api/v1/players/player-1/transfer",
        json={
            "destination_club": "Raja CA",
            "transfer_fee": 5000.0,
            "departure_reason": "Relocation",
            "transfer_date": "2026-06-01"
        }
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "logged successfully" in body["message"]
    assert db_get_player.called
    assert db_post_transfer.called
    assert db_patch_player.called

def test_get_player_transfers_list(admin_client, respx_mock):
    """Get the transfer history for a player successfully."""
    db_get_transfers = respx_mock.get(url__regex=r".*/rest/v1/player_transfers\?player_id=eq\.player-1.*").mock(
        return_value=Response(200, json=[{
            "player_id": "player-1",
            "destination_club": "Wydad AC",
            "transfer_fee": 15000.0,
            "departure_reason": "Career advancement",
            "transfer_date": "2026-06-01"
        }])
    )

    res = admin_client.get("/api/v1/players/player-1/transfers")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["destination_club"] == "Wydad AC"
    assert db_get_transfers.called

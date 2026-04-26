"""
tests/test_finances.py — Payments, Subscriptions, Billing Alerts, Invoice Generation

Coverage targets: finances.py 21% → 55%+
Focus areas:
  - Parent payment isolation (always forced Pending)
  - Subscription creation with prorata + billing engine integration
  - Alert check (daily cron) logic
  - Invoice generation
  - Role-based access on payments CRUD
"""
from datetime import date, timedelta
from unittest.mock import AsyncMock


# =========================================================
# PAYMENTS — Role gates
# =========================================================

class TestPaymentsRoleGates:
    """Only admin/coach/super_admin can list and create payments."""

    def test_parent_cannot_list_all_payments(self, parent_client, mocker):
        mocker.patch("routers.finances.supabase.get_payments", new_callable=AsyncMock, return_value=[])
        r = parent_client.get("/api/v1/finances/payments")
        assert r.status_code == 403

    def test_admin_can_list_all_payments(self, admin_client, mocker):
        mocker.patch("routers.finances.supabase.get_payments", new_callable=AsyncMock, return_value=[
            {"id": "p1", "amount": 300}
        ])
        r = admin_client.get("/api/v1/finances/payments")
        assert r.status_code == 200

    def test_coach_can_list_all_payments(self, authed_as, mocker):
        with authed_as("coach", user_id="coach-1") as c:
            mocker.patch("routers.finances.supabase.get_payments", new_callable=AsyncMock, return_value=[])
            r = c.get("/api/v1/finances/payments")
            assert r.status_code == 200

    def test_unauthenticated_cannot_list_payments(self, client):
        r = client.get("/api/v1/finances/payments")
        assert r.status_code == 401

    def test_parent_cannot_delete_payment(self, parent_client, mocker):
        mocker.patch("routers.finances.supabase.delete_payment", new_callable=AsyncMock)
        r = parent_client.delete("/api/v1/finances/payments/pay-1")
        assert r.status_code == 403

    def test_admin_can_delete_payment(self, admin_client, mocker):
        mocker.patch("routers.finances.supabase.delete_payment", new_callable=AsyncMock, return_value=None)
        r = admin_client.delete("/api/v1/finances/payments/pay-1")
        assert r.status_code == 200
        assert r.json()["message"] == "Payment deleted successfully"


# =========================================================
# PARENT PAYMENT — Always forced Pending
# =========================================================

class TestParentPayment:
    """POST /payments/parent must always force status=Pending."""

    VALID_PAYMENT = {
        "user_id": "parent-1",
        "amount": 200,
        "status": "Completed",
        "payment_method": "Cash",
    }

    def test_parent_payment_forced_pending(self, parent_client, mocker):
        """Even if parent sends status=Completed, backend forces Pending."""
        mock_insert = mocker.patch(
            "routers.finances.supabase.insert_payment",
            new_callable=AsyncMock,
            return_value=[{"id": "pay-new", "status": "Pending", "amount": 200}],
        )
        mocker.patch("routers.finances.supabase.insert_notification", new_callable=AsyncMock)

        r = parent_client.post("/api/v1/finances/payments/parent", json=self.VALID_PAYMENT)
        assert r.status_code == 200

        # Verify the data sent to Supabase has status forced to Pending
        call_args = mock_insert.call_args[0][0]
        assert call_args["status"] == "Pending"

    def test_parent_payment_notifies_admin(self, parent_client, mocker):
        mocker.patch(
            "routers.finances.supabase.insert_payment",
            new_callable=AsyncMock,
            return_value=[{"id": "pay-2", "status": "Pending", "amount": 150}],
        )
        mock_notif = mocker.patch("routers.finances.supabase.insert_notification", new_callable=AsyncMock)

        r = parent_client.post("/api/v1/finances/payments/parent", json={
            "user_id": "parent-1", "amount": 150, "status": "Completed", "payment_method": "Cash"
        })
        assert r.status_code == 200
        # Should have sent an admin_alert notification
        mock_notif.assert_called_once()
        notif_data = mock_notif.call_args[0][0]
        assert notif_data["type"] == "admin_alert"
        assert notif_data["target_role"] == "Admin"

    def test_parent_payment_invalid_amount_rejected(self, parent_client, mocker):
        r = parent_client.post("/api/v1/finances/payments/parent", json={
            "user_id": "parent-1", "amount": -50, "status": "Completed", "payment_method": "Cash"
        })
        assert r.status_code == 422


# =========================================================
# ADMIN PAYMENT — Create with notifications
# =========================================================

class TestAdminPaymentCreate:
    """POST /payments — admin creates payment + notifies user + admin."""

    def test_create_completed_payment_sends_success_notification(self, admin_client, mocker):
        mocker.patch(
            "routers.finances.supabase.insert_payment",
            new_callable=AsyncMock,
            return_value=[{"id": "pay-1", "amount": 500, "status": "Completed"}],
        )
        mock_notif = mocker.patch("routers.finances.supabase.insert_notification", new_callable=AsyncMock)

        r = admin_client.post("/api/v1/finances/payments", json={
            "user_id": "player-1", "amount": 500, "status": "Completed", "payment_method": "Cash"
        })
        assert r.status_code == 200
        # 2 notifications: user + admin
        assert mock_notif.call_count == 2

    def test_create_payment_with_overdue_status(self, admin_client, mocker):
        mocker.patch(
            "routers.finances.supabase.insert_payment",
            new_callable=AsyncMock,
            return_value=[{"id": "pay-2", "amount": 300, "status": "Overdue"}],
        )
        mocker.patch("routers.finances.supabase.insert_notification", new_callable=AsyncMock)

        r = admin_client.post("/api/v1/finances/payments", json={
            "user_id": "player-2", "amount": 300, "status": "Pending", "payment_method": "Transfer"
        })
        assert r.status_code == 200

    def test_notification_failure_does_not_break_payment(self, admin_client, mocker):
        mocker.patch(
            "routers.finances.supabase.insert_payment",
            new_callable=AsyncMock,
            return_value=[{"id": "pay-3", "amount": 100}],
        )
        mocker.patch(
            "routers.finances.supabase.insert_notification",
            new_callable=AsyncMock,
            side_effect=Exception("SMTP down"),
        )

        r = admin_client.post("/api/v1/finances/payments", json={
            "user_id": "u1", "amount": 100, "status": "Completed", "payment_method": "Cash"
        })
        # Payment should still succeed even if notification fails
        assert r.status_code == 200


# =========================================================
# SUBSCRIPTIONS
# =========================================================

class TestSubscriptions:
    """Subscription CRUD + prorata logic."""

    def test_list_subscriptions_enriches_with_alert_status(self, admin_client, mocker):
        future_date = (date.today() + timedelta(days=2)).isoformat()
        mocker.patch("routers.finances.supabase.get_subscriptions", new_callable=AsyncMock, return_value=[
            {"id": "s1", "status": "active", "next_due_date": future_date, "billing_type": "monthly"}
        ])
        mocker.patch("routers.finances.supabase.get_academy_settings", new_callable=AsyncMock, return_value={})

        r = admin_client.get("/api/v1/finances/subscriptions")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        # Should have computed alert_status_realtime and days_until_due
        assert "alert_status_realtime" in data[0]
        assert "days_until_due" in data[0]
        assert data[0]["alert_status_realtime"] == "approaching"

    def test_list_subscriptions_with_season_end(self, admin_client, mocker):
        far_future = (date.today() + timedelta(days=60)).isoformat()
        season_end = (date.today() + timedelta(days=5)).isoformat()
        mocker.patch("routers.finances.supabase.get_subscriptions", new_callable=AsyncMock, return_value=[
            {"id": "s1", "status": "active", "next_due_date": far_future}
        ])
        mocker.patch("routers.finances.supabase.get_academy_settings", new_callable=AsyncMock, return_value={
            "season_end": season_end
        })

        r = admin_client.get("/api/v1/finances/subscriptions")
        assert r.status_code == 200

    def test_parent_cannot_list_all_subscriptions(self, parent_client, mocker):
        r = parent_client.get("/api/v1/finances/subscriptions")
        assert r.status_code == 403

    def test_create_subscription_computes_prorata(self, authed_as, mocker):
        with authed_as("admin", user_id="admin-1") as c:
            start = date.today().replace(day=15)

            mock_insert_sub = mocker.patch(
                "routers.finances.supabase.insert_subscription",
                new_callable=AsyncMock,
                return_value={"id": "sub-new", "status": "active"},
            )
            mocker.patch(
                "routers.finances.supabase.insert_payment",
                new_callable=AsyncMock,
                return_value=[{"id": "pay-prorata"}],
            )
            mocker.patch("routers.finances.supabase.insert_notification", new_callable=AsyncMock)
            mocker.patch("routers.finances.supabase.get_next_invoice_sequence", return_value=1001)

            r = c.post("/api/v1/finances/subscriptions", json={
                "player_id": "player-1",
                "user_id": "parent-1",
                "billing_type": "monthly",
                "start_date": start.isoformat(),
                "monthly_amount": 300,
            })
            assert r.status_code == 200

            # Verify prorata was calculated
            sub_data = mock_insert_sub.call_args[0][0]
            assert sub_data["status"] == "active"
            assert sub_data["prorata_days"] > 0
            assert sub_data["prorata_amount"] > 0

    def test_create_subscription_annual_type(self, admin_client, mocker):
        start = date.today().replace(day=1)
        mocker.patch(
            "routers.finances.supabase.insert_subscription",
            new_callable=AsyncMock,
            return_value={"id": "sub-annual"},
        )
        mocker.patch("routers.finances.supabase.insert_payment", new_callable=AsyncMock, return_value=[{}])
        mocker.patch("routers.finances.supabase.insert_notification", new_callable=AsyncMock)
        mocker.patch("routers.finances.supabase.get_next_invoice_sequence", return_value=1002)

        r = admin_client.post("/api/v1/finances/subscriptions", json={
            "player_id": "p2",
            "billing_type": "annual",
            "start_date": start.isoformat(),
            "monthly_amount": 300,
            "annual_amount": 3000,
        })
        assert r.status_code == 200

    def test_delete_subscription(self, authed_as, mocker):
        with authed_as("admin", user_id="admin-1") as c:
            mocker.patch("routers.finances.supabase.delete_subscription", new_callable=AsyncMock)
            r = c.delete("/api/v1/finances/subscriptions/sub-1")
            assert r.status_code == 200
            assert r.json()["success"] is True

    def test_update_subscription(self, authed_as, mocker):
        with authed_as("admin", user_id="admin-1") as c:
            mocker.patch(
                "routers.finances.supabase.update_subscription",
                new_callable=AsyncMock,
                return_value={"id": "sub-1", "status": "suspended"},
            )
            r = c.patch("/api/v1/finances/subscriptions/sub-1", json={"status": "suspended"})
            assert r.status_code == 200


# =========================================================
# ALERT CHECK — Daily cron
# =========================================================

class TestAlertCheck:
    """POST /alert-check — checks all subs and sends alerts for status changes."""

    def test_alert_check_sends_notification_on_status_change(self, authed_as, mocker):
        with authed_as("admin", user_id="admin-1") as c:
            overdue_date = (date.today() - timedelta(days=5)).isoformat()

            mocker.patch("routers.finances.supabase.get_subscriptions", new_callable=AsyncMock, return_value=[
                {
                    "id": "s1", "status": "active", "alert_status": "none",
                    "next_due_date": overdue_date, "user_id": "parent-1",
                    "players": {"full_name": "Youssef"}
                }
            ])
            mocker.patch("routers.finances.supabase.get_academy_settings", new_callable=AsyncMock, return_value={})
            mock_notif = mocker.patch("routers.finances.supabase.insert_notification", new_callable=AsyncMock)
            mocker.patch("routers.finances.supabase.update_subscription_alert_status", new_callable=AsyncMock)

            r = c.post("/api/v1/finances/alert-check")
            assert r.status_code == 200
            data = r.json()
            assert data["success"] is True
            assert data["alerts_sent"] >= 1
            # Should notify both admin and parent
            assert mock_notif.call_count >= 2

    def test_alert_check_skips_unchanged_status(self, authed_as, mocker):
        with authed_as("admin", user_id="admin-1") as c:
            overdue_date = (date.today() - timedelta(days=5)).isoformat()

            mocker.patch("routers.finances.supabase.get_subscriptions", new_callable=AsyncMock, return_value=[
                {
                    "id": "s2", "status": "active", "alert_status": "late",
                    "next_due_date": overdue_date,
                    "players": {"full_name": "Ahmed"}
                }
            ])
            mocker.patch("routers.finances.supabase.get_academy_settings", new_callable=AsyncMock, return_value={})
            mock_notif = mocker.patch("routers.finances.supabase.insert_notification", new_callable=AsyncMock)

            r = c.post("/api/v1/finances/alert-check")
            assert r.status_code == 200
            # Same status → no new alert
            assert r.json()["alerts_sent"] == 0
            mock_notif.assert_not_called()

    def test_alert_check_skips_inactive_subscriptions(self, authed_as, mocker):
        with authed_as("admin", user_id="admin-1") as c:
            mocker.patch("routers.finances.supabase.get_subscriptions", new_callable=AsyncMock, return_value=[
                {"id": "s3", "status": "terminated", "alert_status": "none",
                 "next_due_date": (date.today() - timedelta(days=40)).isoformat()}
            ])
            mocker.patch("routers.finances.supabase.get_academy_settings", new_callable=AsyncMock, return_value={})

            r = c.post("/api/v1/finances/alert-check")
            assert r.status_code == 200
            assert r.json()["alerts_sent"] == 0

    def test_alert_check_auto_terminates_over_30_days(self, authed_as, mocker):
        with authed_as("admin", user_id="admin-1") as c:
            very_overdue = (date.today() - timedelta(days=35)).isoformat()

            mocker.patch("routers.finances.supabase.get_subscriptions", new_callable=AsyncMock, return_value=[
                {
                    "id": "s4", "status": "active", "alert_status": "suspended",
                    "next_due_date": very_overdue, "user_id": "parent-4",
                    "players": {"full_name": "Karim"}
                }
            ])
            mocker.patch("routers.finances.supabase.get_academy_settings", new_callable=AsyncMock, return_value={})
            mocker.patch("routers.finances.supabase.insert_notification", new_callable=AsyncMock)
            mock_update = mocker.patch("routers.finances.supabase.update_subscription", new_callable=AsyncMock)

            r = c.post("/api/v1/finances/alert-check")
            assert r.status_code == 200
            # Should auto-terminate
            mock_update.assert_called_once()
            update_data = mock_update.call_args[0][1]
            assert update_data["status"] == "terminated"


# =========================================================
# INVOICE GENERATION
# =========================================================

class TestInvoiceGeneration:
    """POST /subscriptions/{sub_id}/generate-invoice"""

    def test_generate_invoice_monthly(self, authed_as, mocker):
        with authed_as("admin", user_id="admin-1") as c:
            next_due = date.today().isoformat()

            mocker.patch("routers.finances.supabase.get_subscriptions", new_callable=AsyncMock, return_value=[
                {
                    "id": "sub-1", "player_id": "p1", "user_id": "u1",
                    "billing_type": "monthly", "monthly_amount": 300,
                    "next_due_date": next_due
                }
            ])
            mocker.patch("routers.finances.supabase.get_next_invoice_sequence", return_value=2001)
            mocker.patch("routers.finances.supabase.insert_payment", new_callable=AsyncMock, return_value=[{}])
            mock_update = mocker.patch("routers.finances.supabase.update_subscription", new_callable=AsyncMock)

            r = c.post("/api/v1/finances/subscriptions/sub-1/generate-invoice")
            assert r.status_code == 200
            data = r.json()
            assert data["success"] is True
            assert data["amount"] == 300
            assert "invoice_number" in data
            # Should advance the next_due_date
            mock_update.assert_called_once()

    def test_generate_invoice_annual_uses_annual_amount(self, authed_as, mocker):
        with authed_as("admin", user_id="admin-1") as c:
            next_due = date.today().isoformat()

            mocker.patch("routers.finances.supabase.get_subscriptions", new_callable=AsyncMock, return_value=[
                {
                    "id": "sub-2", "player_id": "p2", "user_id": "u2",
                    "billing_type": "annual", "monthly_amount": 300,
                    "annual_amount": 3000, "next_due_date": next_due
                }
            ])
            mocker.patch("routers.finances.supabase.get_next_invoice_sequence", return_value=2002)
            mocker.patch("routers.finances.supabase.insert_payment", new_callable=AsyncMock, return_value=[{}])
            mocker.patch("routers.finances.supabase.update_subscription", new_callable=AsyncMock)

            r = c.post("/api/v1/finances/subscriptions/sub-2/generate-invoice")
            assert r.status_code == 200
            assert r.json()["amount"] == 3000

    def test_generate_invoice_hybrid_uses_3x_monthly(self, authed_as, mocker):
        with authed_as("admin", user_id="admin-1") as c:
            next_due = date.today().isoformat()

            mocker.patch("routers.finances.supabase.get_subscriptions", new_callable=AsyncMock, return_value=[
                {
                    "id": "sub-3", "player_id": "p3",
                    "billing_type": "hybrid", "monthly_amount": 200,
                    "next_due_date": next_due
                }
            ])
            mocker.patch("routers.finances.supabase.get_next_invoice_sequence", return_value=2003)
            mocker.patch("routers.finances.supabase.insert_payment", new_callable=AsyncMock, return_value=[{}])
            mocker.patch("routers.finances.supabase.update_subscription", new_callable=AsyncMock)

            r = c.post("/api/v1/finances/subscriptions/sub-3/generate-invoice")
            assert r.status_code == 200
            assert r.json()["amount"] == 600  # 200 * 3

    def test_generate_invoice_404_unknown_subscription(self, authed_as, mocker):
        with authed_as("admin", user_id="admin-1") as c:
            mocker.patch("routers.finances.supabase.get_subscriptions", new_callable=AsyncMock, return_value=[])

            r = c.post("/api/v1/finances/subscriptions/nonexistent/generate-invoice")
            assert r.status_code == 404


# =========================================================
# PAYMENT UPDATE + notifications
# =========================================================

class TestPaymentUpdate:
    """PATCH /payments/{payment_id}"""

    def test_update_payment_sends_status_notification(self, admin_client, mocker):
        mocker.patch(
            "routers.finances.supabase.update_payment",
            new_callable=AsyncMock,
            return_value=[{"id": "p1", "status": "Completed", "amount": 300}],
        )
        mock_notif = mocker.patch("routers.finances.supabase.insert_notification", new_callable=AsyncMock)

        r = admin_client.patch("/api/v1/finances/payments/p1", json={
            "user_id": "u1", "amount": 300, "status": "Completed", "payment_method": "Cash"
        })
        assert r.status_code == 200
        # 2 notifications: user + admin
        assert mock_notif.call_count == 2

    def test_update_payment_returns_result_when_empty(self, admin_client, mocker):
        mocker.patch(
            "routers.finances.supabase.update_payment",
            new_callable=AsyncMock,
            return_value=[],
        )
        r = admin_client.patch("/api/v1/finances/payments/p1", json={
            "user_id": "u1", "amount": 300, "status": "Pending", "payment_method": "Cash"
        })
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_coach_cannot_update_payment(self, authed_as, mocker):
        with authed_as("coach", user_id="coach-1") as c:
            r = c.patch("/api/v1/finances/payments/p1", json={
                "user_id": "u1", "amount": 300, "status": "Completed", "payment_method": "Cash"
            })
            assert r.status_code == 403

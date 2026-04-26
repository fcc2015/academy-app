"""
Tests for services/email_service.py — email rendering + SMTP failure handling.

We do NOT actually send email in tests. Instead:
- Mock smtplib.SMTP to verify the SMTP flow (login + sendmail).
- For wiring tests, mock send_* at the consumer side and verify they're called
  with the right arguments.
"""
import pytest
from unittest.mock import MagicMock, patch

from services import email_service


# ─── _send_email behavior ─────────────────────────────────────


class TestSendEmail:
    def test_returns_false_when_smtp_not_configured(self, monkeypatch):
        """No credentials → no-op, returns False (used in dev/test)."""
        monkeypatch.setattr(email_service, "SMTP_USER", "")
        monkeypatch.setattr(email_service, "SMTP_PASS", "")
        result = email_service._send_email("user@test.com", "Subject", "<p>body</p>")
        assert result is False

    @patch("services.email_service.smtplib.SMTP")
    def test_sends_via_smtp_when_configured(self, mock_smtp_cls, monkeypatch):
        """With creds, opens SMTP, calls starttls, login, sendmail, returns True."""
        monkeypatch.setattr(email_service, "SMTP_USER", "noreply@test.com")
        monkeypatch.setattr(email_service, "SMTP_PASS", "secret")

        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        result = email_service._send_email("user@test.com", "Hi", "<p>body</p>")
        assert result is True

        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("noreply@test.com", "secret")
        mock_server.sendmail.assert_called_once()
        # Check the recipient was passed
        args = mock_server.sendmail.call_args[0]
        assert args[1] == "user@test.com"

    @patch("services.email_service.smtplib.SMTP")
    def test_returns_false_when_smtp_raises(self, mock_smtp_cls, monkeypatch):
        """SMTP failure must NOT raise — emails are best-effort."""
        monkeypatch.setattr(email_service, "SMTP_USER", "noreply@test.com")
        monkeypatch.setattr(email_service, "SMTP_PASS", "secret")
        mock_smtp_cls.side_effect = Exception("Connection refused")

        result = email_service._send_email("user@test.com", "Hi", "<p>body</p>")
        assert result is False


# ─── Template rendering ───────────────────────────────────────


class TestTemplates:
    def test_welcome_email_has_working_login_link(self, mocker):
        """Welcome link must point to FRONTEND_URL/login, not href='#'."""
        captured = {}

        def fake_send(to, subject, html):
            captured["html"] = html
            return True

        mocker.patch("services.email_service._send_email", side_effect=fake_send)
        email_service.send_welcome_email("user@test.com", "Mohamed")

        assert "/login" in captured["html"]
        assert 'href="#"' not in captured["html"]
        assert "Mohamed" in captured["html"]

    def test_welcome_email_subject(self, mocker):
        captured = {}
        mocker.patch(
            "services.email_service._send_email",
            side_effect=lambda to, subject, html: captured.update({"subject": subject}) or True,
        )
        email_service.send_welcome_email("user@test.com", "Sara")
        assert "Bienvenue" in captured["subject"]

    def test_payment_receipt_includes_amount_and_order_id(self, mocker):
        captured = {}
        mocker.patch(
            "services.email_service._send_email",
            side_effect=lambda to, subject, html: captured.update({"subject": subject, "html": html}) or True,
        )
        email_service.send_payment_receipt(
            to="payer@test.com",
            payer_name="Ahmed Benali",
            amount=99.50,
            currency="USD",
            plan_name="Premium",
            order_id="PAYPAL-ORDER-XYZ",
            paid_at="2026-04-26 10:30 UTC",
        )
        assert "99.50" in captured["html"]
        assert "USD" in captured["html"]
        assert "Premium" in captured["html"]
        assert "PAYPAL-ORDER-XYZ" in captured["html"]
        assert "Ahmed Benali" in captured["html"]
        # Subject should contain plan + amount
        assert "Premium" in captured["subject"]
        assert "99.50" in captured["subject"]

    def test_payment_receipt_uses_frontend_url(self, mocker, monkeypatch):
        from core.config import settings
        monkeypatch.setattr(settings, "FRONTEND_URL", "https://my-academy.example.com")

        captured = {}
        mocker.patch(
            "services.email_service._send_email",
            side_effect=lambda to, subject, html: captured.update({"html": html}) or True,
        )
        email_service.send_payment_receipt(
            to="x@test.com", payer_name="P", amount=10, currency="MAD",
            plan_name="Basic", order_id="ID", paid_at="now",
        )
        assert "https://my-academy.example.com" in captured["html"]

    def test_overdue_notification_includes_player_name_and_days(self, mocker):
        captured = {}
        mocker.patch(
            "services.email_service._send_email",
            side_effect=lambda to, subject, html: captured.update({"subject": subject, "html": html}) or True,
        )
        email_service.send_overdue_notification(
            to="parent@test.com",
            player_name="Youssef",
            amount=300.0,
            days_overdue=5,
            due_date="2026-04-21",
        )
        assert "Youssef" in captured["html"]
        assert "5" in captured["html"]
        assert "300" in captured["html"]
        assert "2026-04-21" in captured["html"]
        assert "Youssef" in captured["subject"]

    def test_otp_email_includes_code_and_expiry(self, mocker):
        captured = {}
        mocker.patch(
            "services.email_service._send_email",
            side_effect=lambda to, subject, html: captured.update({"subject": subject, "html": html}) or True,
        )
        email_service.send_otp_email("u@test.com", "123456", purpose="verify")
        assert "123456" in captured["html"]
        assert "10 minutes" in captured["html"]
        assert "123456" in captured["subject"]

    def test_otp_email_reset_purpose_changes_title(self, mocker):
        captured = {}
        mocker.patch(
            "services.email_service._send_email",
            side_effect=lambda to, subject, html: captured.update({"subject": subject}) or True,
        )
        email_service.send_otp_email("u@test.com", "999000", purpose="reset")
        # Reset purpose should mention password
        assert "mot de passe" in captured["subject"].lower() or "999000" in captured["subject"]


# ─── Wiring: register triggers welcome email ───────────────────


class TestRegisterWiring:
    def test_register_triggers_welcome_email(self, client, mocker):
        async def fake_signup(email, password, data=None):
            return {"user": {"id": "new-user-1"}}

        mocker.patch("services.supabase_client.supabase.sign_up", side_effect=fake_signup)
        spy = mocker.patch("routers.auth.send_welcome_email", return_value=True)

        res = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newcomer@test.com",
                "password": "validpass123",
                "role": "parent",
                "full_name": "Hassan",
            },
        )
        assert res.status_code == 200
        spy.assert_called_once()
        # Check positional / keyword args contain the email + name
        call_kwargs = spy.call_args.kwargs
        call_args = spy.call_args.args
        assert "newcomer@test.com" in (list(call_args) + list(call_kwargs.values()))
        assert "Hassan" in (list(call_args) + list(call_kwargs.values()))

    def test_register_does_not_fail_when_welcome_email_raises(self, client, mocker):
        """Email failure must not break registration."""
        async def fake_signup(email, password, data=None):
            return {"user": {"id": "new-user-2"}}

        mocker.patch("services.supabase_client.supabase.sign_up", side_effect=fake_signup)
        mocker.patch("routers.auth.send_welcome_email", side_effect=Exception("SMTP down"))

        res = client.post(
            "/api/v1/auth/register",
            json={"email": "x@test.com", "password": "validpass123", "role": "parent"},
        )
        assert res.status_code == 200

    def test_register_uses_email_prefix_when_no_full_name(self, client, mocker):
        async def fake_signup(email, password, data=None):
            return {"user": {"id": "new-user-3"}}

        mocker.patch("services.supabase_client.supabase.sign_up", side_effect=fake_signup)
        spy = mocker.patch("routers.auth.send_welcome_email", return_value=True)

        client.post(
            "/api/v1/auth/register",
            json={"email": "anonymous@test.com", "password": "validpass123", "role": "parent"},
        )
        # No full_name → falls back to email prefix
        all_args = list(spy.call_args.args) + list(spy.call_args.kwargs.values())
        assert "anonymous" in all_args


# ─── Wiring: PayPal capture triggers receipt email ─────────────


class TestCaptureWiring:
    def _capture_response_body(self, paypal_status="COMPLETED"):
        """Build a realistic PayPal capture response body."""
        return {
            "id": "ORDER-123",
            "status": paypal_status,
            "payer": {
                "email_address": "payer@test.com",
                "name": {"given_name": "Karim", "surname": "Tazi"},
            },
            "purchase_units": [{
                "payments": {"captures": [{
                    "id": "CAPTURE-XYZ",
                    "amount": {"value": "49.99", "currency_code": "USD"},
                }]}
            }],
        }

    def test_capture_completed_triggers_receipt_email(self, client, respx_mock, mocker):
        from httpx import Response as HxResp
        respx_mock.post(url__regex=r".*/v1/oauth2/token").mock(
            return_value=HxResp(200, json={"access_token": "tok"})
        )
        respx_mock.post(url__regex=r".*/v2/checkout/orders/ORDER-123/capture").mock(
            return_value=HxResp(201, json=self._capture_response_body("COMPLETED"))
        )
        # DB updates (transaction + academy)
        respx_mock.patch(url__regex=r".*/rest/v1/payment_transactions.*").mock(return_value=HxResp(204))
        respx_mock.patch(url__regex=r".*/rest/v1/academies.*").mock(return_value=HxResp(204))

        spy = mocker.patch("routers.payments_gateway.send_payment_receipt", return_value=True)

        res = client.post(
            "/api/v1/payments/gateway/capture-order",
            json={"order_id": "ORDER-123", "academy_id": "academy-1", "plan_id": "premium"},
        )
        assert res.status_code == 200
        assert res.json()["success"] is True

        spy.assert_called_once()
        kw = spy.call_args.kwargs
        assert kw["to"] == "payer@test.com"
        assert kw["payer_name"] == "Karim Tazi"
        assert kw["amount"] == 49.99
        assert kw["currency"] == "USD"
        assert kw["plan_name"] == "premium"
        assert kw["order_id"] == "ORDER-123"

    def test_capture_failed_does_not_send_receipt(self, client, respx_mock, mocker):
        """Non-COMPLETED capture status → no receipt sent."""
        from httpx import Response as HxResp
        respx_mock.post(url__regex=r".*/v1/oauth2/token").mock(
            return_value=HxResp(200, json={"access_token": "tok"})
        )
        respx_mock.post(url__regex=r".*/v2/checkout/orders/ORDER-456/capture").mock(
            return_value=HxResp(201, json=self._capture_response_body("PENDING"))
        )
        respx_mock.patch(url__regex=r".*/rest/v1/payment_transactions.*").mock(return_value=HxResp(204))

        spy = mocker.patch("routers.payments_gateway.send_payment_receipt", return_value=True)

        res = client.post(
            "/api/v1/payments/gateway/capture-order",
            json={"order_id": "ORDER-456", "academy_id": "academy-1"},
        )
        assert res.status_code == 200
        spy.assert_not_called()

    def test_capture_does_not_fail_when_receipt_email_raises(self, client, respx_mock, mocker):
        """Receipt failure must not break the capture flow."""
        from httpx import Response as HxResp
        respx_mock.post(url__regex=r".*/v1/oauth2/token").mock(
            return_value=HxResp(200, json={"access_token": "tok"})
        )
        respx_mock.post(url__regex=r".*/v2/checkout/orders/ORDER-789/capture").mock(
            return_value=HxResp(201, json=self._capture_response_body("COMPLETED"))
        )
        respx_mock.patch(url__regex=r".*/rest/v1/payment_transactions.*").mock(return_value=HxResp(204))
        respx_mock.patch(url__regex=r".*/rest/v1/academies.*").mock(return_value=HxResp(204))

        mocker.patch("routers.payments_gateway.send_payment_receipt", side_effect=Exception("SMTP boom"))

        res = client.post(
            "/api/v1/payments/gateway/capture-order",
            json={"order_id": "ORDER-789", "academy_id": "academy-1"},
        )
        assert res.status_code == 200
        assert res.json()["success"] is True

    def test_capture_skips_receipt_when_payer_email_missing(self, client, respx_mock, mocker):
        """If PayPal returns no payer email, just skip receipt — don't crash."""
        from httpx import Response as HxResp
        body = self._capture_response_body("COMPLETED")
        body["payer"] = {}  # no email
        respx_mock.post(url__regex=r".*/v1/oauth2/token").mock(
            return_value=HxResp(200, json={"access_token": "tok"})
        )
        respx_mock.post(url__regex=r".*/v2/checkout/orders/ORDER-NOEMAIL/capture").mock(
            return_value=HxResp(201, json=body)
        )
        respx_mock.patch(url__regex=r".*/rest/v1/payment_transactions.*").mock(return_value=HxResp(204))
        respx_mock.patch(url__regex=r".*/rest/v1/academies.*").mock(return_value=HxResp(204))

        spy = mocker.patch("routers.payments_gateway.send_payment_receipt", return_value=True)

        res = client.post(
            "/api/v1/payments/gateway/capture-order",
            json={"order_id": "ORDER-NOEMAIL", "academy_id": "academy-1"},
        )
        assert res.status_code == 200
        spy.assert_not_called()

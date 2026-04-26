"""
Unit tests for services/billing_engine.py — pure logic, no mocks needed.

This module handles money calculations and alert thresholds — bugs here mean
either undercharging customers or wrongly suspending paying ones.
"""
import pytest
from datetime import date, timedelta
from unittest.mock import patch

from services.billing_engine import (
    calculate_prorata,
    get_next_due_date,
    get_alert_status,
    get_alert_notification,
    generate_invoice_number,
)


# ─── calculate_prorata ─────────────────────────────────────────


class TestCalculateProrata:
    def test_full_month_when_starting_first_day(self):
        """Starting on day 1 → pay for the full month."""
        amount, days = calculate_prorata(date(2026, 1, 1), 300.0)
        assert days == 31
        assert amount == 300.0

    def test_one_day_when_starting_last_day(self):
        """Starting on the last day → pay for 1 day only."""
        amount, days = calculate_prorata(date(2026, 1, 31), 310.0)
        assert days == 1
        assert amount == round(310.0 / 31, 2)

    def test_mid_month(self):
        """Starting mid-month → ~half the amount."""
        amount, days = calculate_prorata(date(2026, 4, 16), 300.0)
        assert days == 15  # April has 30 days, 30 - 16 + 1 = 15
        assert amount == round((300.0 / 30) * 15, 2)

    def test_february_non_leap(self):
        amount, days = calculate_prorata(date(2026, 2, 15), 280.0)
        assert days == 14  # 28 - 15 + 1 = 14
        assert amount == round((280.0 / 28) * 14, 2)

    def test_february_leap_year(self):
        amount, days = calculate_prorata(date(2024, 2, 29), 290.0)
        assert days == 1
        assert amount == round(290.0 / 29, 2)

    def test_zero_amount(self):
        amount, days = calculate_prorata(date(2026, 4, 10), 0.0)
        assert amount == 0.0
        assert days == 21

    def test_rounding_to_two_decimals(self):
        amount, _ = calculate_prorata(date(2026, 1, 7), 100.0)
        assert amount == round(amount, 2)


# ─── get_next_due_date ─────────────────────────────────────────


class TestGetNextDueDate:
    def test_monthly_simple(self):
        assert get_next_due_date("monthly", date(2026, 4, 10)) == date(2026, 5, 10)

    def test_monthly_december_rolls_to_january(self):
        assert get_next_due_date("monthly", date(2026, 12, 15)) == date(2027, 1, 15)

    def test_monthly_jan31_clamps_to_feb28(self):
        """Day 31 + 1 month → Feb 28 (or 29 in leap year)."""
        assert get_next_due_date("monthly", date(2026, 1, 31)) == date(2026, 2, 28)

    def test_monthly_jan31_clamps_to_feb29_leap(self):
        assert get_next_due_date("monthly", date(2024, 1, 31)) == date(2024, 2, 29)

    def test_annual_normal(self):
        assert get_next_due_date("annual", date(2026, 4, 10)) == date(2027, 4, 10)

    def test_annual_feb29_clamps_to_feb28(self):
        """Annual from Feb 29 → next year's Feb 28."""
        result = get_next_due_date("annual", date(2024, 2, 29))
        assert result == date(2025, 2, 28)

    def test_hybrid_three_months(self):
        assert get_next_due_date("hybrid", date(2026, 4, 10)) == date(2026, 7, 10)

    def test_hybrid_december_rolls_into_next_year(self):
        assert get_next_due_date("hybrid", date(2026, 11, 10)) == date(2027, 2, 10)

    def test_achtor_three_months(self):
        assert get_next_due_date("achtor", date(2026, 4, 10)) == date(2026, 7, 10)

    def test_semi_annual_six_months(self):
        assert get_next_due_date("semi_annual", date(2026, 4, 10)) == date(2026, 10, 10)

    def test_semi_annual_rolls_into_next_year(self):
        assert get_next_due_date("semi_annual", date(2026, 8, 15)) == date(2027, 2, 15)

    def test_unknown_type_defaults_to_monthly(self):
        assert get_next_due_date("xyz", date(2026, 4, 10)) == date(2026, 5, 10)


# ─── get_alert_status ──────────────────────────────────────────


class TestGetAlertStatus:
    @patch("services.billing_engine.date")
    def test_none_when_far_in_future(self, mock_date):
        mock_date.today.return_value = date(2026, 4, 1)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        # Due in 10 days → none
        assert get_alert_status(date(2026, 4, 11)) == "none"

    @patch("services.billing_engine.date")
    def test_approaching_within_3_days(self, mock_date):
        mock_date.today.return_value = date(2026, 4, 10)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        assert get_alert_status(date(2026, 4, 13)) == "approaching"
        assert get_alert_status(date(2026, 4, 10)) == "approaching"  # due today

    @patch("services.billing_engine.date")
    def test_late_within_7_days_overdue(self, mock_date):
        mock_date.today.return_value = date(2026, 4, 10)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        assert get_alert_status(date(2026, 4, 5)) == "late"  # 5 days late
        assert get_alert_status(date(2026, 4, 3)) == "late"  # 7 days late

    @patch("services.billing_engine.date")
    def test_suspended_8_to_30_days_overdue(self, mock_date):
        mock_date.today.return_value = date(2026, 4, 30)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        assert get_alert_status(date(2026, 4, 15)) == "suspended"  # 15 days late
        assert get_alert_status(date(2026, 4, 1)) == "suspended"  # 29 days late

    @patch("services.billing_engine.date")
    def test_terminated_over_30_days(self, mock_date):
        mock_date.today.return_value = date(2026, 5, 15)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        assert get_alert_status(date(2026, 4, 1)) == "terminated"  # 44 days late

    @patch("services.billing_engine.date")
    def test_season_end_skip(self, mock_date):
        """If today is more than 15 days past season end, no alerts even when overdue."""
        mock_date.today.return_value = date(2026, 7, 1)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        # Season ended 2 weeks before today → returns "none" regardless
        assert get_alert_status(date(2026, 5, 1), season_end=date(2026, 6, 10)) == "none"

    @patch("services.billing_engine.date")
    def test_season_end_within_buffer_still_checks(self, mock_date):
        """Within the 15-day buffer past season end → still evaluate normally."""
        mock_date.today.return_value = date(2026, 6, 15)
        mock_date.side_effect = lambda *a, **kw: date(*a, **kw)
        # Today=Jun 15, due=Jun 12 → 3 days late → "late". Season ends Jun 30 (buffer not relevant).
        assert get_alert_status(date(2026, 6, 12), season_end=date(2026, 6, 30)) == "late"


# ─── get_alert_notification ───────────────────────────────────


class TestGetAlertNotification:
    def test_returns_none_for_unknown_status(self):
        assert get_alert_notification("none", "Ahmed") is None
        assert get_alert_notification("unknown", "Ahmed") is None

    def test_approaching_includes_player_name(self):
        notif = get_alert_notification("approaching", "Ahmed")
        assert notif is not None
        assert "Ahmed" in notif["message"]
        assert notif["type"] == "alert"
        assert "title" in notif

    def test_late_message(self):
        notif = get_alert_notification("late", "Sara")
        assert notif is not None
        assert "Sara" in notif["message"]

    def test_suspended_message(self):
        notif = get_alert_notification("suspended", "Youssef")
        assert notif is not None
        assert "Youssef" in notif["message"]

    def test_terminated_message(self):
        notif = get_alert_notification("terminated", "Karim")
        assert notif is not None
        assert "Karim" in notif["message"]

    def test_all_status_titles_unique(self):
        """Each alert level should have a distinct title for UX clarity."""
        statuses = ["approaching", "late", "suspended", "terminated"]
        titles = {get_alert_notification(s, "X")["title"] for s in statuses}
        assert len(titles) == 4


# ─── generate_invoice_number ─────────────────────────────────


class TestGenerateInvoiceNumber:
    def test_format(self):
        """Format: INV-YYYYMM-NNNN."""
        with patch("services.billing_engine.date") as mock_date:
            mock_date.today.return_value = date(2026, 4, 26)
            inv = generate_invoice_number(7)
            assert inv == "INV-202604-0007"

    def test_pads_sequence_to_4_digits(self):
        with patch("services.billing_engine.date") as mock_date:
            mock_date.today.return_value = date(2026, 1, 1)
            assert generate_invoice_number(1) == "INV-202601-0001"
            assert generate_invoice_number(99) == "INV-202601-0099"
            assert generate_invoice_number(9999) == "INV-202601-9999"

    def test_pads_month_to_2_digits(self):
        with patch("services.billing_engine.date") as mock_date:
            mock_date.today.return_value = date(2026, 3, 15)
            inv = generate_invoice_number(42)
            assert "202603" in inv

    def test_sequences_are_unique_for_different_values(self):
        with patch("services.billing_engine.date") as mock_date:
            mock_date.today.return_value = date(2026, 4, 1)
            inv_a = generate_invoice_number(100)
            inv_b = generate_invoice_number(101)
            assert inv_a != inv_b

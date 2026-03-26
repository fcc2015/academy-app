"""
Billing Engine — Subscription & Payment Intelligence
Handles: prorata calculation, next due dates, alert status logic
"""
from datetime import date, timedelta
from calendar import monthrange


def calculate_prorata(start_date: date, monthly_amount: float) -> tuple[float, int]:
    """
    Calculate the prorata amount for the first month.
    Returns (amount, days_count)
    """
    _, days_in_month = monthrange(start_date.year, start_date.month)
    remaining_days = days_in_month - start_date.day + 1
    prorata_amount = round((monthly_amount / days_in_month) * remaining_days, 2)
    return prorata_amount, remaining_days


def get_next_due_date(billing_type: str, from_date: date) -> date:
    """Calculate the next due date based on billing type."""
    if billing_type == "monthly":
        # Same day next month
        month = from_date.month + 1
        year = from_date.year
        if month > 12:
            month = 1
            year += 1
        # Handle end of month (e.g., Jan 31 -> Feb 28)
        _, days_in_month = monthrange(year, month)
        day = min(from_date.day, days_in_month)
        return date(year, month, day)
    elif billing_type == "annual":
        try:
            return date(from_date.year + 1, from_date.month, from_date.day)
        except ValueError:
            return date(from_date.year + 1, from_date.month, 28)
    elif billing_type == "hybrid":
        # 3 months at a time
        new_month = from_date.month + 3
        new_year = from_date.year
        while new_month > 12:
            new_month -= 12
            new_year += 1
        _, days_in_month = monthrange(new_year, new_month)
        return date(new_year, new_month, min(from_date.day, days_in_month))
    elif billing_type == "achtor":
        # Installment (usually 3 months in sports context)
        new_month = from_date.month + 3
        new_year = from_date.year
        while new_month > 12:
            new_month -= 12
            new_year += 1
        _, days_in_month = monthrange(new_year, new_month)
        return date(new_year, new_month, min(from_date.day, days_in_month))
    elif billing_type == "semi_annual":
        new_month = from_date.month + 6
        new_year = from_date.year
        while new_month > 12:
            new_month -= 12
            new_year += 1
        _, days_in_month = monthrange(new_year, new_month)
        return date(new_year, new_month, min(from_date.day, days_in_month))
    else:
        # Default to monthly
        return get_next_due_date("monthly", from_date)


def get_alert_status(next_due_date: date, season_end: date | None = None) -> str:
    """
    Get the alert status based on days until/since due date.
    Returns: 'none', 'approaching', 'late', 'suspended', 'terminated'
    """
    today = date.today()
    
    # If a season end is provided, and we are significantly past it (e.g. 15 days), skip alerts
    if season_end and today > (season_end + timedelta(days=15)):
        return "none"
        
    days_diff = (next_due_date - today).days

    if days_diff > 3:
        return "none"
    elif 0 <= days_diff <= 3:
        return "approaching"
    elif -7 <= days_diff < 0:
        return "late"
    elif -30 <= days_diff < -7:
        return "suspended"
    else:  # > 30 days overdue
        return "terminated"


def get_alert_notification(alert_status: str, player_name: str) -> dict | None:
    """
    Build a notification dict for a given alert status.
    Returns None if no notification is needed.
    """
    messages = {
        "approaching": {
            "title": "📅 قرب موعد الأداء",
            "message": f"نود تذكيركم بأن موعد أداء اشتراك {player_name} سيكون خلال 3 أيام. يرجى التسوية لتفادي أي انقطاع.",
            "type": "alert"
        },
        "late": {
            "title": "⚠️ تأخير في الأداء / تذكير",
            "message": f"هناك تأخير في أداء واجب اشتراك {player_name}. يرجى تسوية الوضعية في أقرب وقت ممكن.",
            "type": "alert"
        },
        "suspended": {
            "title": "🚫 تنبيه تعليق الحساب",
            "message": f"سيتم تعليق حساب {player_name} بسبب تأخير الأداء لأكثر من 7 أيام. يرجى الاتصال بالإدارة.",
            "type": "alert"
        },
        "terminated": {
            "title": "🔒 تم تعليق الحساب (توقف)",
            "message": f"لقد تم تعليق حساب {player_name} نهائياً بسبب تجاوز مدة التأخير (30 يوماً). يرجى تسوية المتأخرات لإعادة التفعيل.",
            "type": "alert"
        }
    }
    return messages.get(alert_status)


def generate_invoice_number(sequence_val: int) -> str:
    """Generate a formatted invoice number."""
    today = date.today()
    return f"INV-{today.year}{today.month:02d}-{sequence_val:04d}"

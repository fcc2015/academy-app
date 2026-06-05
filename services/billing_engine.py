"""
Billing Engine — Subscription & Payment Intelligence
Handles: prorata calculation, next due dates, alert status logic

Alert stages (PRO):
  - "reminder"    → 1 day before due date
  - "due_today"   → on the due date
  - "late_2d"     → 2 days after due date
  - "late_5d"     → 5 days after due date
  - "suspended"   → 10 days after due date (player restricted)
  - "terminated"  → 30+ days (final)
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
    PRO stages:
      - "none"       → more than 1 day before due
      - "reminder"   → exactly 1 day before due
      - "due_today"  → on the due date
      - "late_2d"    → 2 days after due
      - "late_5d"    → 5 days after due
      - "suspended"  → 10+ days after due (player restricted from groups/evaluations/matches)
      - "terminated" → 30+ days after due
    """
    today = date.today()

    # If a season end is provided, and we are significantly past it (e.g. 15 days), skip alerts
    if season_end and today > (season_end + timedelta(days=15)):
        return "none"

    days_diff = (next_due_date - today).days  # positive = future, negative = past

    if days_diff > 1:
        return "none"
    elif days_diff == 1:
        return "reminder"      # قبل يوم من الموعد
    elif days_diff == 0:
        return "due_today"     # في الموعد المحدد
    elif -2 <= days_diff < 0:
        return "late_2d"       # إنذار بعد يومين
    elif -5 <= days_diff < -2:
        return "late_5d"       # إنذار بالحضور بعد 5 أيام
    elif -30 <= days_diff < -5:
        return "suspended"     # حذف من المجموعة بعد 10 أيام + تقييد
    else:  # > 30 days overdue
        return "terminated"


def get_alert_notification(alert_status: str, player_name: str, billing_type: str = "monthly", amount: float | None = None) -> dict | None:
    """
    Build a notification dict for a given alert status.
    Returns None if no notification is needed.
    """
    bt = (billing_type or "monthly").lower()
    if bt == "annual":
        cycle_word = "السنوي"
    elif bt == "semi_annual":
        cycle_word = "النصف سنوي"
    elif bt in ("hybrid", "achtor"):
        cycle_word = "الفصلي"
    else:
        cycle_word = "الشهري"

    amount_text = f" ({amount:.2f} درهم)" if amount else ""

    messages = {
        "reminder": {
            "title": "📅 تذكير — غداً موعد الأداء",
            "message": (
                f"نذكركم بأن موعد أداء الاشتراك {cycle_word} للاعب {player_name}{amount_text} "
                "سيحل غداً. يرجى التسوية لتفادي أي انقطاع."
            ),
            "type": "alert"
        },
        "due_today": {
            "title": "🔔 اليوم موعد الأداء",
            "message": (
                f"نذكركم بأن اليوم هو آخر موعد لأداء الاشتراك {cycle_word} للاعب {player_name}{amount_text}. "
                "يرجى التسوية اليوم."
            ),
            "type": "alert"
        },
        "late_2d": {
            "title": "⚠️ إنذار — تأخر الأداء يومين",
            "message": (
                f"هناك تأخير يومين في أداء الاشتراك {cycle_word} للاعب {player_name}{amount_text}. "
                "يرجى تسوية الوضعية في أقرب وقت."
            ),
            "type": "alert"
        },
        "late_5d": {
            "title": "🟡 إنذار بالحضور — تأخر 5 أيام",
            "message": (
                f"تأخر أداء الاشتراك {cycle_word} للاعب {player_name}{amount_text} لأكثر من 5 أيام. "
                "ننبهكم بأنه في حالة عدم التسوية خلال 5 أيام سيتم تعليق حساب اللاعب."
            ),
            "type": "alert"
        },
        "suspended": {
            "title": "🔴 تعليق الحساب — تأخر +10 أيام",
            "message": (
                f"تم تعليق حساب {player_name} بسبب تأخر الأداء لأكثر من 10 أيام. "
                "اللاعب لن يرى التقييمات ولن يصله استدعاءات المقابلات ولن يشارك في المجموعة. "
                "يرجى الاتصال بالإدارة لتسوية الوضعية."
            ),
            "type": "alert"
        },
        "terminated": {
            "title": "🔒 إيقاف نهائي — تأخر +30 يوم",
            "message": (
                f"تم إيقاف حساب {player_name} نهائياً بسبب تجاوز مدة التأخير (30 يوماً). "
                "يرجى تسوية المتأخرات لإعادة التفعيل."
            ),
            "type": "alert"
        }
    }
    return messages.get(alert_status)


def generate_invoice_number(sequence_val: int) -> str:
    """Generate a formatted invoice number."""
    today = date.today()
    return f"INV-{today.year}{today.month:02d}-{sequence_val:04d}"

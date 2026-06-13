import asyncio
import logging
from collections import defaultdict
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token, require_role
from core.context import academy_id_ctx
from services.supabase_client import supabase

logger = logging.getLogger("analytics")

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
    dependencies=[Depends(verify_token)]
)


def _month_key(dt_str: str) -> str:
    """Return YYYY-MM from an ISO datetime/date string, or '' on failure."""
    try:
        return dt_str[:7]
    except Exception:
        return ""


def _month_label(key: str) -> str:
    """Return a short display label (e.g. 'Jan 25') from YYYY-MM."""
    try:
        d = datetime.strptime(key, "%Y-%m")
        return d.strftime("%b %y")
    except Exception:
        return key


def _last_n_months(n: int = 6) -> list[str]:
    """Return list of YYYY-MM keys for the last n months (oldest first)."""
    now = date.today()
    months = []
    for i in range(n - 1, -1, -1):
        d = (now.replace(day=1) - timedelta(days=1)) if False else now
        year = now.year
        month = now.month - i
        while month <= 0:
            month += 12
            year -= 1
        months.append(f"{year}-{str(month).zfill(2)}")
    return months


@router.get("/overview")
async def get_analytics_overview():
    """
    Full analytics payload consumed by AdminAnalytics.jsx.
    Runs all DB calls in parallel and returns:
    - summary KPIs (with change vs. last month)
    - monthly revenue (12 months)
    - monthly new players (12 months)
    - payment method distribution
    - payment status breakdown
    - attendance rate by month (6 months)
    - top 5 players by attendance
    - age category distribution
    - evaluation score averages per month
    - expense totals per month
    """
    try:
        # ── 1. Parallel data fetch ──────────────────────────────────────
        tasks = [
            supabase.client.get(f"{supabase.url}/rest/v1/payments?select=id,amount,status,payment_method,payment_date,created_at"),
            supabase.client.get(f"{supabase.url}/rest/v1/players?select=user_id,u_category,created_at,users!players_user_id_fkey(full_name)"),
            supabase.client.get(f"{supabase.url}/rest/v1/attendance?select=player_id,status,date"),
            supabase.client.get(f"{supabase.url}/rest/v1/evaluations?select=player_id,technical_score,tactical_score,physical_score,mental_score,created_at,players(users!players_user_id_fkey(full_name))"),
            supabase.client.get(f"{supabase.url}/rest/v1/expenses?select=amount,category,expense_date,created_at"),
            supabase.client.get(f"{supabase.url}/rest/v1/coaches?select=id,status"),
            supabase.client.get(f"{supabase.url}/rest/v1/subscriptions?select=id,status,monthly_amount,annual_amount,billing_type,created_at"),
        ]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        payments   = responses[0].json() if not isinstance(responses[0], Exception) and responses[0].status_code == 200 else []
        players    = responses[1].json() if not isinstance(responses[1], Exception) and responses[1].status_code == 200 else []
        attendance = responses[2].json() if not isinstance(responses[2], Exception) and responses[2].status_code == 200 else []
        evals      = responses[3].json() if not isinstance(responses[3], Exception) and responses[3].status_code == 200 else []
        expenses   = responses[4].json() if not isinstance(responses[4], Exception) and responses[4].status_code == 200 else []
        coaches    = responses[5].json() if not isinstance(responses[5], Exception) and responses[5].status_code == 200 else []
        subs       = responses[6].json() if not isinstance(responses[6], Exception) and responses[6].status_code == 200 else []

        # Process evaluations to calculate overall_score on the fly if missing
        for ev in evals:
            if "overall_score" not in ev or ev["overall_score"] is None:
                scores = [
                    ev.get("technical_score", 0) or 0,
                    ev.get("tactical_score", 0) or 0,
                    ev.get("physical_score", 0) or 0,
                    ev.get("mental_score", 0) or 0
                ]
                ev["overall_score"] = sum(scores) / len(scores) if scores else 0

        months_12 = _last_n_months(12)
        months_6  = _last_n_months(6)

        # ── 2. Revenue by month (last 12) ──────────────────────────────
        completed_statuses = {"paid", "Paid", "Completed", "completed"}
        rev_by_month: dict[str, float] = defaultdict(float)
        for p in payments:
            if p.get("status") in completed_statuses:
                key = _month_key(p.get("payment_date") or p.get("created_at") or "")
                if key:
                    rev_by_month[key] += p.get("amount", 0) or 0

        revenue_trend = [
            {"month": _month_label(m), "revenue": round(rev_by_month.get(m, 0), 2)}
            for m in months_12
        ]

        # ── 3. New players by month (last 12) ──────────────────────────
        players_by_month: dict[str, int] = defaultdict(int)
        for pl in players:
            key = _month_key(pl.get("created_at") or "")
            if key:
                players_by_month[key] += 1

        players_trend = [
            {"month": _month_label(m), "players": players_by_month.get(m, 0)}
            for m in months_12
        ]

        # ── 4. Payment method distribution ─────────────────────────────
        method_counts: dict[str, int] = defaultdict(int)
        for p in payments:
            m = p.get("payment_method") or "Other"
            method_counts[m] += 1

        payment_methods = [
            {"name": k, "value": v}
            for k, v in sorted(method_counts.items(), key=lambda x: -x[1])
        ]

        # ── 5. Payment status breakdown ────────────────────────────────
        status_counts: dict[str, int] = defaultdict(int)
        for p in payments:
            s = p.get("status") or "Unknown"
            status_counts[s] += 1

        payment_statuses = [{"name": k, "value": v} for k, v in status_counts.items()]

        # ── 6. Total revenue & completion rate ─────────────────────────
        total_revenue = sum(p.get("amount", 0) or 0 for p in payments if p.get("status") in completed_statuses)
        total_payments = len(payments)
        completed_payments = len([p for p in payments if p.get("status") in completed_statuses])
        completion_rate = round((completed_payments / total_payments * 100) if total_payments else 0, 1)

        # ── 7. Attendance rate by month (last 6) ──────────────────────
        att_present: dict[str, int] = defaultdict(int)
        att_total:   dict[str, int] = defaultdict(int)
        for a in attendance:
            key = _month_key(a.get("date") or "")
            if key in months_6:
                att_total[key] += 1
                if a.get("status") in ("present", "Present"):
                    att_present[key] += 1

        attendance_trend = [
            {
                "month": _month_label(m),
                "rate": round((att_present[m] / att_total[m] * 100) if att_total[m] else 0, 1),
                "sessions": att_total[m]
            }
            for m in months_6
        ]

        # ── 8. Top 5 players by attendance count ──────────────────────
        player_att_count: dict[str, int] = defaultdict(int)
        for a in attendance:
            if a.get("status") in ("present", "Present"):
                player_att_count[a.get("player_id") or ""] += 1

        player_name_map = {pl.get("user_id"): (pl.get("users") or {}).get("full_name", "?") for pl in players}
        top_attenders = sorted(player_att_count.items(), key=lambda x: -x[1])[:5]
        top_players_attendance = [
            {"name": player_name_map.get(pid, pid), "sessions": cnt}
            for pid, cnt in top_attenders
        ]

        # ── 9. Age category distribution ──────────────────────────────
        cat_counts: dict[str, int] = defaultdict(int)
        for pl in players:
            cat = pl.get("u_category") or "Non défini"
            cat_counts[cat] += 1

        age_categories = [
            {"name": k, "value": v}
            for k, v in sorted(cat_counts.items(), key=lambda x: -x[1])
        ]

        # ── 10. Evaluation score by month (last 6) ────────────────────
        eval_scores: dict[str, list] = defaultdict(list)
        for ev in evals:
            key = _month_key(ev.get("created_at") or "")
            if key in months_6:
                score = ev.get("overall_score")
                if score is not None:
                    try:
                        eval_scores[key].append(float(score))
                    except (ValueError, TypeError):
                        pass

        evaluation_trend = [
            {
                "month": _month_label(m),
                "avg_score": round(sum(eval_scores[m]) / len(eval_scores[m]), 1) if eval_scores.get(m) else None
            }
            for m in months_6
        ]

        # ── 11. Expense totals by month (last 6) ──────────────────────
        exp_by_month: dict[str, float] = defaultdict(float)
        exp_by_cat: dict[str, float] = defaultdict(float)
        for ex in expenses:
            key = _month_key(ex.get("expense_date") or ex.get("created_at") or "")
            amt = float(ex.get("amount", 0) or 0)
            if key in months_6:
                exp_by_month[key] += amt
            cat = ex.get("category") or "Other"
            exp_by_cat[cat] += amt

        expense_trend = [
            {"month": _month_label(m), "expenses": round(exp_by_month.get(m, 0), 2)}
            for m in months_6
        ]

        expense_categories = [
            {"name": k, "value": round(v, 2)}
            for k, v in sorted(exp_by_cat.items(), key=lambda x: -x[1])[:6]
        ]

        # ── 12. Summary KPIs ──────────────────────────────────────────
        total_players = len(players)
        active_coaches = len([c for c in coaches if c.get("status") in ("Active", "active")]) or len(coaches)
        active_subs = len([s for s in subs if s.get("status") == "active"])

        # Month-over-month: compare current vs previous month revenue
        cur_month  = months_12[-1]
        prev_month = months_12[-2]
        cur_rev  = rev_by_month.get(cur_month, 0)
        prev_rev = rev_by_month.get(prev_month, 0)
        rev_change = round(((cur_rev - prev_rev) / prev_rev * 100) if prev_rev else 0, 1)

        cur_players  = players_by_month.get(cur_month, 0)
        prev_players = players_by_month.get(prev_month, 0)
        players_change = cur_players - prev_players

        # Overall attendance rate
        total_att_present = sum(1 for a in attendance if a.get("status") in ("present", "Present"))
        total_att = len(attendance)
        overall_att_rate = round((total_att_present / total_att * 100) if total_att else 0, 1)

        summary = {
            "total_players": total_players,
            "total_revenue": round(total_revenue, 2),
            "revenue_change_pct": rev_change,
            "players_change": players_change,
            "completion_rate": completion_rate,
            "overall_attendance_rate": overall_att_rate,
            "active_coaches": active_coaches,
            "active_subscriptions": active_subs,
            "total_payments": total_payments,
            "total_evaluations": len(evals),
        }

        return {
            "summary": summary,
            "revenue_trend": revenue_trend,
            "players_trend": players_trend,
            "payment_methods": payment_methods,
            "payment_statuses": payment_statuses,
            "attendance_trend": attendance_trend,
            "top_players_attendance": top_players_attendance,
            "age_categories": age_categories,
            "evaluation_trend": evaluation_trend,
            "expense_trend": expense_trend,
            "expense_categories": expense_categories,
        }

    except Exception as e:
        logger.error("Analytics overview error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

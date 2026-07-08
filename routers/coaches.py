import logging
from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token, require_role
from core.context import user_id_ctx, role_ctx
from typing import List
from schemas.coaches import CoachCreate, CoachResponse
from services.supabase_client import supabase

logger = logging.getLogger("coaches")
from urllib.parse import quote
import secrets
import string
import uuid as uuid_lib

router = APIRouter(prefix="/coaches", tags=["Coaches"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[CoachResponse])
async def get_all_coaches():
    try:
        response = await supabase.get_coaches()
        # sous_admin: filter to only coaches in their assigned branches
        if role_ctx.get(None) == "sous_admin":
            uid = user_id_ctx.get(None)
            assigned = await supabase._get(
                f"/rest/v1/sous_admin_branches?user_id=eq.{uid}&select=branch_id"
            )
            allowed_branches = {r["branch_id"] for r in (assigned or [])}
            response = [c for c in (response or []) if c.get("branch_id") in allowed_branches]
        return response
    except Exception as e:
        logger.error("Error fetching coaches: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

def generate_temp_password(length=12):
    import string, secrets, random
    lower = string.ascii_lowercase
    upper = string.ascii_uppercase
    digits = string.digits
    special = "!@#$%^&*"
    pwd = [
        secrets.choice(lower),
        secrets.choice(upper),
        secrets.choice(digits),
        secrets.choice(special)
    ]
    pwd += [secrets.choice(lower + upper + digits + special) for _ in range(length - 4)]
    random.shuffle(pwd)
    return "".join(pwd)

@router.post("/", response_model=CoachResponse, dependencies=[Depends(require_role("admin", "super_admin"))])
async def create_coach(coach: CoachCreate):
    try:
        coach_dict = coach.model_dump()
        email = coach_dict.get("email", "")
        
        # --- Duplicate Check: Email ---
        if email:
            existing = await supabase._get(f"/rest/v1/coaches?email=eq.{quote(email)}&select=id")
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"This email is already used by another coach. | هاد الإيميل ديجا مستعمل من طرف مدرب آخر: {email}"
                )
        
        temp_password = generate_temp_password()

        # Create user in Supabase Auth so they can log in
        from core.context import academy_id_ctx
        academy_id = academy_id_ctx.get(None)
        
        try:
            auth_user = await supabase.admin_create_user(
                email=email,
                password=temp_password,
                role="coach",
                full_name=coach_dict.get("full_name"),
                academy_id=academy_id
            )
            coach_dict["user_id"] = auth_user["id"]
            logger.info("Created coach auth user %s for %s", auth_user["id"], email)
        except Exception as auth_err:
            logger.error("Failed to create coach auth user: %s", auth_err, exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create auth account for coach: {str(auth_err)}"
            )

        # Insert directly into coaches table — gracefully drop u_category if
        # the column doesn't exist yet (admin hasn't run the migration).
        try:
            response = await supabase.insert_coach(coach_dict)
        except Exception as ie:
            ie_msg = str(ie).lower()
            if "u_category" in ie_msg or "column" in ie_msg or "schema" in ie_msg:
                logger.warning("insert_coach failed; retrying without u_category (run migrate_coach_u_category.sql to fix)")
                coach_dict.pop("u_category", None)
                response = await supabase.insert_coach(coach_dict)
            else:
                raise

        created_coach = response[0]
        # Show the temp password to the admin once
        created_coach["temp_password"] = temp_password

        return created_coach
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error("Error creating coach: %s", e, exc_info=True)
        if "duplicate" in error_msg.lower() or "23505" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This email already exists. | هاد الإيميل ديجا كاين: {email}"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"[DEBUG] create_coach failed: {type(e).__name__}: {error_msg}"
        )

@router.put("/{coach_id}", dependencies=[Depends(require_role("admin", "super_admin"))])
async def update_coach(coach_id: str, coach: CoachCreate):
    try:
        coach_dict = coach.model_dump(exclude_none=True)
        try:
            response = await supabase.update_coach(coach_id, coach_dict)
        except Exception as ie:
            ie_msg = str(ie).lower()
            if "u_category" in ie_msg or "column" in ie_msg or "schema" in ie_msg:
                logger.warning("update_coach: retrying without u_category (run migrate_coach_u_category.sql to fix)")
                coach_dict.pop("u_category", None)
                response = await supabase.update_coach(coach_id, coach_dict)
            else:
                raise
        return response[0] if isinstance(response, list) else response
    except Exception as e:
        logger.error("Error updating coach: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.delete("/{coach_id}", dependencies=[Depends(require_role("admin", "super_admin"))])
async def delete_coach(coach_id: str):
    try:
        await supabase.delete_coach(coach_id)
        return {"message": "Coach deleted successfully"}
    except Exception as e:
        logger.error("Error deleting coach: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )


@router.get("/{coach_id}/metrics", dependencies=[Depends(require_role("admin", "super_admin", "sous_admin"))])
async def get_coach_metrics(coach_id: str):
    """
    Returns a full performance scorecard for a coach:
    - players_count: total players in their squads
    - sessions_count: distinct training session dates
    - attendance_rate: % present across all sessions
    - avg_evaluation_score: mean overall_score for their players
    - sessions_this_month / sessions_last_month
    - top_players: top 5 by attendance
    - monthly_sessions: last 6 months session counts (for sparkline)
    - recent_evaluations: last 5 evaluations for their players
    """
    import asyncio
    from datetime import date, datetime, timedelta
    from collections import defaultdict
    from core.config import settings as _s

    try:
        # ── 1. Fetch coach profile ────────────────────────────────────────
        coach_res = await supabase._get(f"/rest/v1/coaches?id=eq.{coach_id}&select=*")
        if not coach_res:
            raise HTTPException(status_code=404, detail="Coach not found")
        coach = coach_res[0]

        # ── 2. Find squads run by this coach ─────────────────────────────
        squads_res = await supabase._get(
            f"/rest/v1/squads?coach_id=eq.{coach_id}&select=id,name,u_category"
        )
        squad_ids = [s["id"] for s in (squads_res or [])]

        # ── 3. Parallel: attendance + players + evaluations ──────────────
        async with __import__("httpx").AsyncClient(trust_env=False, timeout=15.0) as client:
            tasks = []

            # Attendance for all squads of this coach
            if squad_ids:
                squad_filter = ",".join(squad_ids)
                att_url = f"{_s.SUPABASE_URL}/rest/v1/attendance?squad_id=in.({squad_filter})&select=player_id,status,date,squad_id"
            else:
                att_url = f"{_s.SUPABASE_URL}/rest/v1/attendance?squad_id=eq.none&select=player_id,status,date"

            tasks.append(client.get(att_url, headers=supabase.admin_headers))

            # Players in coach's u_category (or all if no category)
            u_cat = coach.get("u_category")
            if u_cat:
                players_url = f"{_s.SUPABASE_URL}/rest/v1/players?u_category=eq.{u_cat}&select=user_id,account_status,users!players_user_id_fkey(full_name)"
            else:
                players_url = f"{_s.SUPABASE_URL}/rest/v1/players?select=user_id,account_status,users!players_user_id_fkey(full_name)&limit=200"
            tasks.append(client.get(players_url, headers=supabase.admin_headers))

            # Evaluations — for players in squads
            evals_url = f"{_s.SUPABASE_URL}/rest/v1/evaluations?select=player_id,technical_score,tactical_score,physical_score,mental_score,created_at,players(users!players_user_id_fkey(full_name))&order=created_at.desc&limit=200"
            tasks.append(client.get(evals_url, headers=supabase.admin_headers))

            responses = await asyncio.gather(*tasks, return_exceptions=True)

        attendance = responses[0].json() if not isinstance(responses[0], Exception) and responses[0].status_code == 200 else []
        players    = responses[1].json() if not isinstance(responses[1], Exception) and responses[1].status_code == 200 else []
        all_evals  = responses[2].json() if not isinstance(responses[2], Exception) and responses[2].status_code == 200 else []

        # Process all_evals to calculate overall_score on the fly if missing
        for e in all_evals:
            if "overall_score" not in e or e["overall_score"] is None:
                scores = [
                    e.get("technical_score", 0) or 0,
                    e.get("tactical_score", 0) or 0,
                    e.get("physical_score", 0) or 0,
                    e.get("mental_score", 0) or 0
                ]
                e["overall_score"] = sum(scores) / len(scores) if scores else 0

        player_ids = {p["user_id"] for p in players}

        # Filter evaluations to this coach's players only
        evals = [e for e in all_evals if e.get("player_id") in player_ids] if player_ids else all_evals[:50]

        # ── 4. Sessions (distinct dates) ─────────────────────────────────
        session_dates = sorted({a["date"] for a in attendance if a.get("date")})
        sessions_count = len(session_dates)

        today = date.today()
        cur_month  = today.strftime("%Y-%m")
        prev_month = (today.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")

        sessions_this_month = len({d for d in session_dates if d[:7] == cur_month})
        sessions_last_month = len({d for d in session_dates if d[:7] == prev_month})

        # Monthly sessions for last 6 months (sparkline)
        month_keys = []
        for i in range(5, -1, -1):
            d = today.replace(day=1)
            for _ in range(i):
                d = (d - timedelta(days=1)).replace(day=1)
            month_keys.append(d.strftime("%Y-%m"))

        monthly_sessions = []
        for mk in month_keys:
            cnt = len({d for d in session_dates if d[:7] == mk})
            label = datetime.strptime(mk, "%Y-%m").strftime("%b")
            monthly_sessions.append({"month": label, "sessions": cnt})

        # ── 5. Attendance rate ───────────────────────────────────────────
        total_att = len(attendance)
        present_att = sum(1 for a in attendance if (a.get("status") or "").lower() in ("present", "حاضر"))
        attendance_rate = round((present_att / total_att * 100) if total_att else 0, 1)

        # ── 6. Top 5 players by attendance ──────────────────────────────
        player_present: dict = defaultdict(int)
        player_total: dict = defaultdict(int)
        for a in attendance:
            pid = a.get("player_id")
            if pid:
                player_total[pid] += 1
                if (a.get("status") or "").lower() in ("present", "حاضر"):
                    player_present[pid] += 1

        player_name_map = {p["user_id"]: (p.get("users") or {}).get("full_name", "—") for p in players}
        top_players = sorted(
            [
                {
                    "player_id": pid,
                    "name": player_name_map.get(pid, "—"),
                    "present": player_present[pid],
                    "total": player_total[pid],
                    "rate": round((player_present[pid] / player_total[pid] * 100) if player_total[pid] else 0, 1),
                }
                for pid in player_total
            ],
            key=lambda x: -x["present"]
        )[:5]

        # ── 7. Evaluation score ──────────────────────────────────────────
        scores = [float(e["overall_score"]) for e in evals if e.get("overall_score") is not None]
        avg_evaluation_score = round(sum(scores) / len(scores), 1) if scores else None

        # Recent evaluations (last 5)
        recent_evaluations = []
        for e in evals[:5]:
            player_info = e.get("players") or {}
            name = (player_info.get("users") or {}).get("full_name") if isinstance(player_info, dict) and "users" in player_info else player_info.get("full_name") if isinstance(player_info, dict) else None
            if not name:
                name = player_name_map.get(e.get("player_id"), "—")
            recent_evaluations.append({
                "player_name": name or "—",
                "score": e.get("overall_score"),
                "date": (e.get("created_at") or "")[:10],
            })

        # ── 8. Compose response ──────────────────────────────────────────
        return {
            "coach": {
                "id": coach.get("id"),
                "full_name": coach.get("full_name"),
                "specialization": coach.get("specialization"),
                "status": coach.get("status"),
                "u_category": coach.get("u_category"),
                "photo_url": coach.get("photo_url"),
            },
            "squads": squads_res or [],
            "players_count": len(players),
            "active_players_count": sum(1 for p in players if p.get("account_status") == "Active"),
            "sessions_count": sessions_count,
            "sessions_this_month": sessions_this_month,
            "sessions_last_month": sessions_last_month,
            "attendance_rate": attendance_rate,
            "total_attendance_records": total_att,
            "avg_evaluation_score": avg_evaluation_score,
            "total_evaluations": len(evals),
            "top_players": top_players,
            "monthly_sessions": monthly_sessions,
            "recent_evaluations": recent_evaluations,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching coach metrics for %s: %s", coach_id, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

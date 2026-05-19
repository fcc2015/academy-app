from fastapi import APIRouter, Depends, HTTPException, status, Query
from core.auth_middleware import verify_token, require_role, assert_parent_owns_player
from core.context import user_id_ctx, role_ctx
from typing import List
from schemas.attendance import AttendanceResponse, AttendanceBulkCreate
from services.supabase_client import supabase
from datetime import datetime

import logging
logger = logging.getLogger("attendance")

router = APIRouter(prefix="/attendance", tags=["Attendance"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[AttendanceResponse])
async def get_attendance(squad_id: str = Query(...), date: str = Query(...),
                         user: dict = Depends(require_role("admin", "coach", "super_admin"))):
    try:
        return await supabase.get_attendance(squad_id, date)
    except Exception as e:
        logger.error("Error fetching attendance: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.get("/player/{player_id}")
async def get_player_attendance(player_id: str):
    current_role = role_ctx.get()
    current_user = user_id_ctx.get()
    if current_role == "parent":
        await assert_parent_owns_player(current_user, player_id)
    try:
        return await supabase.get_player_attendance(player_id)
    except Exception as e:
        logger.error("Error fetching player attendance: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.post("/bulk")
async def bulk_upsert_attendance(payload: AttendanceBulkCreate):
    try:
        # Season validation
        settings = await supabase.get_academy_settings()
        if settings:
            s_start = settings.get("season_start")
            s_end = settings.get("season_end")
            att_date = payload.date
            if s_start and att_date < datetime.strptime(s_start, "%Y-%m-%d").date():
                raise HTTPException(status_code=400, detail="Cannot record attendance before the season start date. | لا يمكن تسجيل الحضور قبل تاريخ بداية الموسم.")
            if s_end and att_date > datetime.strptime(s_end, "%Y-%m-%d").date():
                raise HTTPException(status_code=400, detail="Cannot record attendance after the season end date. | لا يمكن تسجيل الحضور بعد تاريخ نهاية الموسم.")

        records = []
        absent_player_ids = []

        for item in payload.records:
            records.append({
                "squad_id": payload.squad_id,
                "player_id": item.player_id,
                "date": payload.date.isoformat(),
                "status": item.status,
                "notes": item.notes
            })
            if item.status and item.status.lower() in ("absent", "غائب", "غياب"):
                absent_player_ids.append(item.player_id)

        result = await supabase.upsert_attendance(records)

        # Send notification to parent for each absent player
        for player_id in absent_player_ids:
            try:
                import httpx as _httpx
                from core.config import settings as _settings
                async with _httpx.AsyncClient(trust_env=False, timeout=5.0) as client:
                    p_res = await client.get(
                        f"{_settings.SUPABASE_URL}/rest/v1/players?id=eq.{player_id}&select=parent_name,u_category,parent_id",
                        headers=supabase.admin_headers,
                    )
                    if p_res.status_code == 200 and p_res.json():
                        player = p_res.json()[0]
                        parent_id = player.get("parent_id")
                        player_name = player.get("parent_name") or "اللاعب"
                        date_str = payload.date.strftime("%d/%m/%Y")

                        notif = {
                            "title": "🔴 غياب اللاعب",
                            "message": f"تم تسجيل غياب {player_name} بتاريخ {date_str}. إذا كان هناك عذر، يرجى التواصل مع الأكاديمية.",
                            "type": "alert",
                        }
                        if parent_id:
                            notif["user_id"] = parent_id
                        else:
                            notif["target_role"] = "parent"

                        await supabase.insert_notification(notif)
            except Exception as notif_err:
                logger.warning("Failed to send absence notification for player %s: %s", player_id, notif_err)

        return result
    except Exception as e:
        logger.error("Error saving attendance: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

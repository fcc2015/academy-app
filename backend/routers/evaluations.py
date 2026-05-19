from fastapi import APIRouter, Depends, HTTPException, status, Query
from core.auth_middleware import verify_token, require_role, assert_parent_owns_player
from core.context import user_id_ctx, role_ctx
from typing import List, Optional
from schemas.evaluations import EvaluationCreate, EvaluationResponse
from services.supabase_client import supabase
from datetime import datetime

import logging
logger = logging.getLogger("evaluations")

router = APIRouter(prefix="/evaluations", tags=["Evaluations"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[EvaluationResponse])
async def get_evaluations(player_id: Optional[str] = Query(None)):
    current_role = role_ctx.get()
    current_user = user_id_ctx.get()
    if current_role == "parent":
        if not player_id:
            raise HTTPException(status_code=403, detail="Access denied — player_id is required.")
        await assert_parent_owns_player(current_user, player_id)
    try:
        return await supabase.get_evaluations(player_id)
    except Exception as e:
        logger.error("Error fetching evaluations: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.post("/", response_model=EvaluationResponse)
async def create_evaluation(evaluation: EvaluationCreate):
    try:
        # Season validation
        settings = await supabase.get_academy_settings()
        eval_date = evaluation.evaluation_date or datetime.utcnow().date()
        if settings:
            s_start = settings.get("season_start")
            s_end = settings.get("season_end")
            if s_start and eval_date < datetime.strptime(s_start, "%Y-%m-%d").date():
                raise HTTPException(status_code=400, detail="Cannot create evaluation before the season start date. | لا يمكن التقييم قبل تاريخ بداية الموسم.")
            if s_end and eval_date > datetime.strptime(s_end, "%Y-%m-%d").date():
                raise HTTPException(status_code=400, detail="Cannot create evaluation after the season end date. | لا يمكن التقييم بعد تاريخ نهاية الموسم.")

        eval_dict = evaluation.model_dump(exclude_none=True, mode='json')
        response = await supabase.insert_evaluation(eval_dict)
        created = response[0] if isinstance(response, list) else response

        # Notify parent about new evaluation
        try:
            player_id = eval_dict.get("player_id")
            if player_id:
                p_res = await supabase._get(f"/rest/v1/players?id=eq.{player_id}&select=parent_name,parent_id")
                if p_res:
                    player = p_res[0]
                    parent_id = player.get("parent_id")
                    player_name = player.get("parent_name") or "اللاعب"
                    notif = {
                        "title": "⭐ تقييم جديد",
                        "message": f"تم إضافة تقييم جديد للاعب {player_name}. ادخل للمنصة لرؤية التفاصيل.",
                        "type": "success",
                    }
                    if parent_id:
                        notif["user_id"] = parent_id
                    else:
                        notif["target_role"] = "parent"
                    await supabase.insert_notification(notif)
        except Exception as notif_err:
            logger.warning("Failed to send evaluation notification: %s", notif_err)

        return created
    except Exception as e:
        logger.error("Error creating evaluation: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.delete("/{evaluation_id}")
async def delete_evaluation(evaluation_id: str):
    try:
        return await supabase.delete_evaluation(evaluation_id)
    except Exception as e:
        logger.error("Error deleting evaluation: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

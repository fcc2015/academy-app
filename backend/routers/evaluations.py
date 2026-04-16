from fastapi import APIRouter, Depends, HTTPException, status, Query
from core.auth_middleware import verify_token, require_role, assert_parent_owns_player
from core.context import user_id_ctx, role_ctx
from typing import List, Optional
from schemas.evaluations import EvaluationCreate, EvaluationResponse
from services.supabase_client import supabase

import logging
logger = logging.getLogger("evaluations")

router = APIRouter(prefix="/evaluations", tags=["Evaluations"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[EvaluationResponse])
async def get_evaluations(player_id: Optional[str] = Query(None)):
    current_role = role_ctx.get()
    current_user = user_id_ctx.get()
    # Parents must specify their own child's player_id and cannot browse all evaluations
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
        eval_dict = evaluation.model_dump(exclude_none=True, mode='json')
        response = await supabase.insert_evaluation(eval_dict)
        return response[0] if isinstance(response, list) else response
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

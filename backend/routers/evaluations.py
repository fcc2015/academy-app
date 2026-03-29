from fastapi import APIRouter, Depends, HTTPException, status, Query
from core.auth_middleware import verify_token
from typing import List, Optional
from schemas.evaluations import EvaluationCreate, EvaluationResponse
from services.supabase_client import supabase

router = APIRouter(prefix="/evaluations", tags=["Evaluations"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[EvaluationResponse])
async def get_evaluations(player_id: Optional[str] = Query(None)):
    try:
        return await supabase.get_evaluations(player_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching evaluations: {str(e)}"
        )

@router.post("/", response_model=EvaluationResponse)
async def create_evaluation(evaluation: EvaluationCreate):
    try:
        eval_dict = evaluation.model_dump(exclude_none=True, mode='json')
        response = await supabase.insert_evaluation(eval_dict)
        return response[0] if isinstance(response, list) else response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating evaluation: {str(e)}"
        )

@router.delete("/{evaluation_id}")
async def delete_evaluation(evaluation_id: str):
    try:
        return await supabase.delete_evaluation(evaluation_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting evaluation: {str(e)}"
        )

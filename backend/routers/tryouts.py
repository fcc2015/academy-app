from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from services.supabase_client import supabase
from typing import Dict, Any

router = APIRouter(prefix="/tryouts", tags=["Tryouts"], dependencies=[Depends(verify_token)])

@router.get("/")
async def get_all_tryouts():
    try:
        return await supabase.get_tryouts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_tryout(data: Dict[str, Any]):
    try:
        res = await supabase.insert_tryout(data)
        return res[0] if isinstance(res, list) and res else res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{tryout_id}/candidates")
async def get_tryout_candidates(tryout_id: str):
    try:
        return await supabase.get_tryout_candidates(tryout_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{tryout_id}/candidates")
async def add_tryout_candidate(tryout_id: str, data: Dict[str, Any]):
    try:
        data["tryout_id"] = tryout_id
        res = await supabase.insert_tryout_candidate(data)
        return res[0] if isinstance(res, list) and res else res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/candidates/{candidate_id}")
async def update_tryout_candidate(candidate_id: str, data: Dict[str, Any]):
    try:
        res = await supabase.update_tryout_candidate(candidate_id, data)
        return res[0] if isinstance(res, list) and res else res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

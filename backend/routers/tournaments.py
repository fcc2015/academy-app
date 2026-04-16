from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from services.supabase_client import supabase
from typing import Dict, Any

import logging
logger = logging.getLogger("tournaments")

router = APIRouter(prefix="/tournaments", tags=["Tournaments"], dependencies=[Depends(verify_token)])

@router.get("/")
async def get_all_tournaments():
    try:
        return await supabase.get_tournaments()
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.post("/")
async def create_tournament(data: Dict[str, Any]):
    try:
        res = await supabase.insert_tournament(data)
        return res[0] if isinstance(res, list) and res else res
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.get("/{tournament_id}/teams")
async def get_tournament_teams(tournament_id: str):
    try:
        return await supabase.get_tournament_teams(tournament_id)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.post("/{tournament_id}/teams")
async def add_tournament_team(tournament_id: str, data: Dict[str, Any]):
    try:
        data["tournament_id"] = tournament_id
        res = await supabase.insert_tournament_team(data)
        return res[0] if isinstance(res, list) and res else res
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.patch("/teams/{team_id}")
async def update_tournament_team(team_id: str, data: Dict[str, Any]):
    try:
        res = await supabase.update_tournament_team(team_id, data)
        return res[0] if isinstance(res, list) and res else res
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.get("/{tournament_id}/matches")
async def get_tournament_matches(tournament_id: str):
    try:
        return await supabase.get_tournament_matches(tournament_id)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.post("/{tournament_id}/matches")
async def add_tournament_match(tournament_id: str, data: Dict[str, Any]):
    try:
        data["tournament_id"] = tournament_id
        res = await supabase.insert_tournament_match(data)
        return res[0] if isinstance(res, list) and res else res
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.patch("/matches/{match_id}")
async def update_tournament_match(match_id: str, data: Dict[str, Any]):
    try:
        res = await supabase.update_tournament_match(match_id, data)
        return res[0] if isinstance(res, list) and res else res
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

from fastapi import APIRouter, HTTPException, status
from typing import List
from schemas.matches import MatchCreate, MatchUpdate, MatchResponse
from services.supabase_client import supabase

router = APIRouter(prefix="/matches", tags=["Matches"])

@router.get("/", response_model=List[MatchResponse])
async def get_all_matches():
    try:
        return await supabase.get_matches()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/coach/{coach_id}", response_model=List[MatchResponse])
async def get_coach_matches(coach_id: str):
    try:
        return await supabase.get_matches_by_coach(coach_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/player/{player_id}", response_model=List[MatchResponse])
async def get_player_matches(player_id: str):
    try:
        return await supabase.get_matches_by_player(player_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=List[MatchResponse])
async def create_match(match: MatchCreate):
    try:
        match_dict = match.model_dump(exclude_unset=True, mode='json')
        return await supabase.insert_match(match_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating match: {str(e)}"
        )

@router.patch("/{match_id}", response_model=List[MatchResponse])
async def update_match(match_id: str, match: MatchUpdate):
    try:
        match_dict = match.model_dump(exclude_unset=True, mode='json')
        return await supabase.update_match(match_id, match_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating match: {str(e)}"
        )

@router.delete("/{match_id}")
async def delete_match(match_id: str):
    try:
        return await supabase.delete_match(match_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting match: {str(e)}"
        )

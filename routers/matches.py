from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from typing import List
from schemas.matches import MatchCreate, MatchUpdate, MatchResponse
from services.supabase_client import supabase

import logging
logger = logging.getLogger("matches")

router = APIRouter(prefix="/matches", tags=["Matches"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[MatchResponse])
async def get_all_matches():
    try:
        return await supabase.get_matches()
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.get("/coach/{coach_id}", response_model=List[MatchResponse])
async def get_coach_matches(coach_id: str):
    try:
        return await supabase.get_matches_by_coach(coach_id)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.get("/player/{player_id}", response_model=List[MatchResponse])
async def get_player_matches(player_id: str):
    try:
        return await supabase.get_matches_by_player(player_id)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.post("/", response_model=List[MatchResponse])
async def create_match(match: MatchCreate):
    try:
        match_dict = match.model_dump(exclude_unset=True, mode='json')
        result = await supabase.insert_match(match_dict)

        # Notify all parents and coaches about upcoming match
        try:
            opponent = match_dict.get("opponent") or match_dict.get("home_team") or "الخصم"
            match_date = (match_dict.get("match_date") or match_dict.get("date") or "")[:10]
            venue = match_dict.get("venue") or match_dict.get("location") or ""
            msg = f"مباراة ضد {opponent}" + (f" بتاريخ {match_date}" if match_date else "") + (f" في {venue}" if venue else "") + "."

            await supabase.insert_notification({
                "title": "🏟️ مباراة جديدة",
                "message": msg,
                "type": "system",
                "target_role": "parent",
            })
            await supabase.insert_notification({
                "title": "🏟️ مباراة جديدة",
                "message": msg,
                "type": "system",
                "target_role": "coach",
            })
        except Exception as notif_err:
            logger.warning("Failed to send match notification: %s", notif_err)

        return result
    except Exception as e:
        logger.error("Error creating match: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.patch("/{match_id}", response_model=List[MatchResponse])
async def update_match(match_id: str, match: MatchUpdate):
    try:
        match_dict = match.model_dump(exclude_unset=True, mode='json')
        result = await supabase.update_match(match_id, match_dict)

        # Notify if result is added (score posted)
        home_score = match_dict.get("home_score")
        away_score = match_dict.get("away_score")
        if home_score is not None and away_score is not None:
            try:
                await supabase.insert_notification({
                    "title": "⚽ نتيجة المباراة",
                    "message": f"تم تسجيل نتيجة المباراة: {home_score} - {away_score}. شكرا لمتابعتكم!",
                    "type": "success",
                    "target_role": "parent",
                })
            except Exception as notif_err:
                logger.warning("Failed to send match result notification: %s", notif_err)

        return result
    except Exception as e:
        logger.error("Error updating match: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.delete("/{match_id}")
async def delete_match(match_id: str):
    try:
        return await supabase.delete_match(match_id)
    except Exception as e:
        logger.error("Error deleting match: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

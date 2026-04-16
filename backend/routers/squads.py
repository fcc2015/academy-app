import logging
from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from typing import List
from schemas.squads import SquadCreate, SquadUpdate, SquadResponse, RosterUpdate
from services.supabase_client import supabase

logger = logging.getLogger("squads")

router = APIRouter(prefix="/squads", tags=["Squads"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[SquadResponse])
async def get_squads():
    try:
        return await supabase.get_squads()
    except Exception as e:
        logger.error("Error fetching squads: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.get("/coach/{user_id}", response_model=List[SquadResponse])
async def get_squads_for_coach(user_id: str):
    try:
        return await supabase.get_squads_for_coach(user_id)
    except Exception as e:
        logger.error("Error fetching coach squads: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.post("/", response_model=SquadResponse)
async def create_squad(squad: SquadCreate):
    try:
        squad_dict = squad.model_dump(exclude_none=True)
        response = await supabase.insert_squad(squad_dict)
        return response[0] if isinstance(response, list) else response
    except Exception as e:
        logger.error("Error creating squad: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.patch("/{squad_id}", response_model=SquadResponse)
async def update_squad(squad_id: str, squad: SquadUpdate):
    try:
        squad_dict = squad.model_dump(exclude_unset=True)
        response = await supabase.update_squad(squad_id, squad_dict)
        
        # Trigger Notification if coach was changed
        if "coach_id" in squad_dict and squad_dict["coach_id"]:
            try:
                await supabase.insert_notification({
                    "title": "Squad Assignment",
                    "message": f"You have been assigned to lead a squad.",
                    "type": "system"
                })
            except Exception as e:
                logger.warning(f"Failed to send squad notification: {e}")
                
        return response[0] if isinstance(response, list) else response
    except Exception as e:
        logger.error("Error updating squad: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.delete("/{squad_id}")
async def delete_squad(squad_id: str):
    try:
        return await supabase.delete_squad(squad_id)
    except Exception as e:
        logger.error("Error deleting squad: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.patch("/{squad_id}/roster")
async def update_squad_roster(squad_id: str, roster: RosterUpdate):
    try:
        return await supabase.update_squad_roster(squad_id, roster.player_ids)
    except Exception as e:
        logger.error("Error updating roster: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )


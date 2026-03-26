from fastapi import APIRouter, HTTPException, status
from typing import List
from schemas.squads import SquadCreate, SquadUpdate, SquadResponse, RosterUpdate
from services.supabase_client import supabase

router = APIRouter(prefix="/squads", tags=["Squads"])

@router.get("/", response_model=List[SquadResponse])
async def get_squads():
    try:
        return await supabase.get_squads()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching squads: {str(e)}"
        )

@router.get("/coach/{user_id}", response_model=List[SquadResponse])
async def get_squads_for_coach(user_id: str):
    try:
        return await supabase.get_squads_for_coach(user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching coach squads: {str(e)}"
        )

@router.post("/", response_model=SquadResponse)
async def create_squad(squad: SquadCreate):
    try:
        squad_dict = squad.model_dump(exclude_none=True)
        response = await supabase.insert_squad(squad_dict)
        return response[0] if isinstance(response, list) else response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating squad: {str(e)}"
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
                print(f"Warning: Failed to send notification {e}")
                
        return response[0] if isinstance(response, list) else response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating squad: {str(e)}"
        )

@router.delete("/{squad_id}")
async def delete_squad(squad_id: str):
    try:
        return await supabase.delete_squad(squad_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting squad: {str(e)}"
        )

@router.patch("/{squad_id}/roster")
async def update_squad_roster(squad_id: str, roster: RosterUpdate):
    try:
        return await supabase.update_squad_roster(squad_id, roster.player_ids)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating roster: {str(e)}"
        )


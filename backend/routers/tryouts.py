from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from services.supabase_client import supabase
from typing import Dict, Any

import logging
logger = logging.getLogger("tryouts")

router = APIRouter(prefix="/tryouts", tags=["Tryouts"], dependencies=[Depends(verify_token)])

@router.get("/")
async def get_all_tryouts():
    try:
        return await supabase.get_tryouts()
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.post("/")
async def create_tryout(data: Dict[str, Any]):
    try:
        res = await supabase.insert_tryout(data)
        return res[0] if isinstance(res, list) and res else res
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.get("/{tryout_id}/candidates")
async def get_tryout_candidates(tryout_id: str):
    try:
        return await supabase.get_tryout_candidates(tryout_id)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.post("/{tryout_id}/candidates")
async def add_tryout_candidate(tryout_id: str, data: Dict[str, Any]):
    try:
        data["tryout_id"] = tryout_id
        res = await supabase.insert_tryout_candidate(data)
        return res[0] if isinstance(res, list) and res else res
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.patch("/candidates/{candidate_id}")
async def update_tryout_candidate(candidate_id: str, data: Dict[str, Any]):
    try:
        res = await supabase.update_tryout_candidate(candidate_id, data)
        return res[0] if isinstance(res, list) and res else res
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.post("/candidates/{candidate_id}/convert")
async def convert_candidate_to_player(candidate_id: str):
    """
    Auto-promote an accepted candidate into a full registered Player with parent credentials.
    """
    import uuid
    from datetime import date
    from routers.players import create_player, PlayerCreate

    try:
        # 1. Fetch candidate
        candidates = await supabase._get(f"/rest/v1/tryout_candidates?id=eq.{candidate_id}")
        if not candidates:
            raise HTTPException(status_code=404, detail="Candidate not found")
        cand = candidates[0]

        if cand.get("status") == "Converted":
            raise HTTPException(status_code=400, detail="Candidate has already been converted to a player.")

        # Calculate approximate birth_date from age
        age = cand.get("age") or 10
        current_year = date.today().year
        birth_year = current_year - int(age)
        birth_date = date(birth_year, 1, 1)

        # Generate a unique user_id for the player
        player_user_id = str(uuid.uuid4())

        # Construct PlayerCreate object with all required fields
        player_data = PlayerCreate(
            user_id=player_user_id,
            full_name=cand.get("full_name", "Player"),
            parent_name=f"Parent of {cand.get('full_name')}",
            parent_whatsapp=cand.get("phone") or "+212600000000",
            parent_email=f"parent_{player_user_id[:8]}@academy.local",
            birth_date=birth_date,
            u_category=f"U{age}",
            subscription_type="Monthly",
            account_status="Active"
        )

        # Call create_player logic
        result = await create_player(player_data)

        # Update candidate status to Converted
        await supabase.update_tryout_candidate(candidate_id, {"status": "Converted"})

        return {
            "success": True,
            "message": f"Candidate {cand.get('full_name')} converted to Player successfully!",
            "player": result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Convert candidate failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to convert candidate: {e}")


from fastapi import APIRouter, Depends, HTTPException
from core.auth_middleware import verify_token
from typing import List
from schemas.injuries import InjuryCreate, InjuryUpdate, InjuryResponse
from services.supabase_client import supabase

import logging
logger = logging.getLogger("injuries")

router = APIRouter(prefix="/injuries", tags=["Injuries"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[InjuryResponse])
async def get_all_injuries():
    try:
        return await supabase.get_injuries()
    except Exception as e:
        logger.error("Error fetching injuries: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.post("/", response_model=InjuryResponse)
async def create_injury(injury: InjuryCreate):
    try:
        data = injury.model_dump()
        data['injury_date'] = data['injury_date'].isoformat()
        if data.get('expected_recovery_date'):
            data['expected_recovery_date'] = data['expected_recovery_date'].isoformat()
        result = await supabase.insert_injury(data)
        created = result[0] if isinstance(result, list) and result else result

        # Notify parent about injury
        try:
            player_id = data.get("player_id")
            if player_id:
                p_res = await supabase._get(f"/rest/v1/players?id=eq.{player_id}&select=parent_name,parent_id")
                if p_res:
                    player = p_res[0]
                    parent_id = player.get("parent_id")
                    player_name = player.get("parent_name") or "اللاعب"
                    injury_type = data.get("injury_type") or "إصابة"
                    notif = {
                        "title": "⚠️ إشعار إصابة",
                        "message": f"تم تسجيل إصابة ({injury_type}) للاعب {player_name}. يرجى التواصل مع الطاقم الطبي.",
                        "type": "alert",
                    }
                    if parent_id:
                        notif["user_id"] = parent_id
                    else:
                        notif["target_role"] = "parent"
                    await supabase.insert_notification(notif)
                    # Also notify admin
                    await supabase.insert_notification({
                        "title": "🏥 إصابة لاعب",
                        "message": f"تم تسجيل إصابة ({injury_type}) للاعب {player_name}.",
                        "type": "alert",
                        "target_role": "admin",
                    })
        except Exception as notif_err:
            logger.warning("Failed to send injury notification: %s", notif_err)

        return created
    except Exception as e:
        logger.error("Error creating injury: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.patch("/{injury_id}", response_model=InjuryResponse)
async def update_injury(injury_id: str, injury: InjuryUpdate):
    try:
        data = injury.model_dump(exclude_unset=True)
        if 'injury_date' in data and data['injury_date']:
            data['injury_date'] = data['injury_date'].isoformat()
        if 'expected_recovery_date' in data and data['expected_recovery_date']:
            data['expected_recovery_date'] = data['expected_recovery_date'].isoformat()
        result = await supabase.update_injury(injury_id, data)

        # If status changed to recovered, notify parent
        new_status = data.get("status", "")
        if new_status.lower() in ("recovered", "متعافي", "عافي", "تعافى"):
            try:
                inj_res = await supabase._get(f"/rest/v1/injuries?id=eq.{injury_id}&select=player_id")
                if inj_res:
                    player_id = inj_res[0].get("player_id")
                    if player_id:
                        p_res = await supabase._get(f"/rest/v1/players?id=eq.{player_id}&select=parent_name,parent_id")
                        if p_res:
                            player = p_res[0]
                            parent_id = player.get("parent_id")
                            player_name = player.get("parent_name") or "اللاعب"
                            notif = {
                                "title": "✅ تعافي اللاعب",
                                "message": f"يسعدنا إخباركم بأن اللاعب {player_name} قد تعافى وعاد للتدريبات.",
                                "type": "success",
                            }
                            if parent_id:
                                notif["user_id"] = parent_id
                            await supabase.insert_notification(notif)
            except Exception as notif_err:
                logger.warning("Failed to send recovery notification: %s", notif_err)

        return result[0] if isinstance(result, list) and result else result
    except Exception as e:
        logger.error("Error updating injury: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.delete("/{injury_id}")
async def delete_injury(injury_id: str):
    try:
        return await supabase.delete_injury(injury_id)
    except Exception as e:
        logger.error("Error deleting injury: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

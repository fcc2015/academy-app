from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from core.context import academy_id_ctx
from services.supabase_client import supabase
from pydantic import BaseModel
import logging
import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/equipment", tags=["Equipment"])

class EquipmentSettingCreate(BaseModel):
    plan_name: str
    entitlements: List[str]

class EquipmentSettingUpdate(BaseModel):
    entitlements: List[str]

def get_entitlements_for_plan(plan_name: str, settings_map: dict) -> list:
    """
    Get the equipment entitlements for a plan.
    Prioritizes DB settings first, then falls back to the user's requirements:
    - Gold (Dahabi): 2 Kits (Tenu) + 1 Tracksuit (Survet)
    - Silver (Fiddi): 2 Kits (Tenu)
    - Bronze (Nohassi): 1 Kit (Tenu)
    """
    plan_lower = (plan_name or "").lower().strip()
    
    # Check custom DB settings first (exact or case-insensitive)
    if plan_name in settings_map:
        return settings_map[plan_name]
    for k, v in settings_map.items():
        if k.lower().strip() == plan_lower:
            return v
            
    # Fallback plan mapping
    if plan_lower in ["golden", "dahabi", "gold", "ذهبي", "الذهبي"]:
        return ["Tenu 1", "Tenu 2", "Survet"]
    elif plan_lower in ["silver", "fiddi", "فضي", "الفضي"]:
        return ["Tenu 1", "Tenu 2"]
    elif plan_lower in ["bronze", "nohassi", "برونزي", "نحاسي", "البرونزي", "النحاسي"]:
        return ["Tenu 1"]
    elif plan_lower in ["monthly", "شهري", "الشهري"]:
        return ["Tenu 1"]
        
    return []

@router.get("/settings")
async def get_equipment_settings():
    """Get equipment entitlements for all plans in the academy."""
    try:
        data = await supabase._get("/rest/v1/equipment_settings?select=*")
        return data if data else []
    except Exception as e:
        logger.error("Error fetching equipment settings: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch equipment settings")

@router.post("/settings")
async def create_or_update_equipment_setting(setting: EquipmentSettingCreate):
    """Create or update equipment settings for a specific plan."""
    academy_id = academy_id_ctx.get()
    if not academy_id:
        raise HTTPException(status_code=400, detail="Academy ID is missing in context")
    
    try:
        # Check if settings for this plan already exist
        existing = await supabase._get(f"/rest/v1/equipment_settings?plan_name=eq.{setting.plan_name}&select=id")
        
        if existing:
            # Update existing
            setting_id = existing[0]["id"]
            payload = {
                "entitlements": setting.entitlements
            }
            res = await supabase._patch(f"/rest/v1/equipment_settings?id=eq.{setting_id}", payload)
            return res
        else:
            # Create new
            payload = {
                "academy_id": academy_id,
                "plan_name": setting.plan_name,
                "entitlements": setting.entitlements
            }
            res = await supabase._post("/rest/v1/equipment_settings", payload)
            return res
    except Exception as e:
        logger.error("Error saving equipment setting: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save equipment setting")

@router.delete("/settings/{setting_id}")
async def delete_equipment_setting(setting_id: str):
    """Delete an equipment setting."""
    try:
        await supabase.client.delete(f"/rest/v1/equipment_settings?id=eq.{setting_id}")
        return {"status": "success", "message": "Equipment setting deleted"}
    except Exception as e:
        logger.error("Error deleting equipment setting: %s", e)
        raise HTTPException(status_code=500, detail="Failed to delete equipment setting")

@router.get("/all-players-status")
async def get_all_players_equipment_status():
    """Get equipment status for all players in the academy."""
    try:
        # Fetch all players with user relation for full_name
        players = await supabase._get("/rest/v1/players?select=*,users(full_name)")
        if not players: 
            return []
        
        # Fetch all equipment settings from DB
        settings = await supabase._get("/rest/v1/equipment_settings?select=plan_name,entitlements")
        settings_map = {s.get("plan_name"): s.get("entitlements", []) for s in (settings or [])}
        
        # Fetch all delivered kits from kit_assignments
        kits = await supabase._get("/rest/v1/kit_assignments?select=*")
        
        results = []
        for p in players:
            p_id = p.get("user_id")
            
            # Resolve plan directly from players.subscription_type
            plan_name = p.get("subscription_type") or "Free"
            
            # Get entitlements for this plan
            entitlements = get_entitlements_for_plan(plan_name, settings_map)
            
            # Get kits assigned to this player
            p_kits = [k for k in (kits or []) if k.get("player_id") == p_id and k.get("status") in ["Assigned", "Returned"]]
            
            status_list = []
            for item in entitlements:
                item_lower = item.lower()
                matching_kit = next((k for k in p_kits if k.get("item_name", "").lower() == item_lower or k.get("item_type", "").lower() == item_lower), None)
                status_list.append({
                    "item_name": item,
                    "status": matching_kit.get("status") if matching_kit else "Pending",
                    "assigned_date": matching_kit.get("assigned_date") if matching_kit else None,
                    "kit_id": matching_kit.get("id") if matching_kit else None
                })
            
            # Get player name securely from users join
            user_full_name = p.get("users", {}).get("full_name") if p.get("users") else None
            player_name = user_full_name or p.get("parent_name") or "Unknown Player"
                
            results.append({
                "player_id": p_id,
                "player_name": player_name,
                "plan_name": plan_name,
                "entitlements": entitlements,
                "status_list": status_list
            })
            
        return results
    except Exception as e:
        logger.error("Error fetching all players equipment status: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch all players equipment status: {str(e)}")

@router.get("/player-status/{player_id}")
async def get_player_equipment_status(player_id: str):
    """
    Get the equipment status for a specific player based on their subscription plan.
    """
    try:
        # Get player with users join
        players_res = await supabase._get(f"/rest/v1/players?user_id=eq.{player_id}&select=*,users(full_name)")
        if not players_res:
            raise HTTPException(status_code=404, detail="Player not found")
        player = players_res[0]
        
        # Resolve plan directly from player.subscription_type
        plan_name = player.get("subscription_type") or "Free"
            
        # Get equipment settings from DB
        settings = await supabase._get(f"/rest/v1/equipment_settings?plan_name=eq.{plan_name}&select=entitlements")
        settings_map = {}
        if settings and len(settings) > 0:
            settings_map[plan_name] = settings[0].get("entitlements", [])
            
        # Get entitlements
        entitlements = get_entitlements_for_plan(plan_name, settings_map)
            
        # Get items from kit_assignments
        delivered_kits = await supabase._get(f"/rest/v1/kit_assignments?player_id=eq.{player_id}&select=*")
        delivered_items = []
        if delivered_kits:
            delivered_items = [k for k in delivered_kits if k.get("status") in ["Assigned", "Returned"]]
            
        status_list = []
        for item in entitlements:
            item_lower = item.lower()
            matching_kit = None
            
            for kit in delivered_items:
                if kit.get("item_name", "").lower() == item_lower or kit.get("item_type", "").lower() == item_lower:
                    matching_kit = kit
                    break
                    
            status_list.append({
                "item_name": item,
                "status": matching_kit.get("status") if matching_kit else "Pending",
                "assigned_date": matching_kit.get("assigned_date") if matching_kit else None,
                "kit_id": matching_kit.get("id") if matching_kit else None
            })
            
        user_full_name = player.get("users", {}).get("full_name") if player.get("users") else None
        player_name = user_full_name or player.get("parent_name") or "Unknown Player"
            
        return {
            "player_id": player_id,
            "player_name": player_name,
            "plan_name": plan_name,
            "entitlements": entitlements,
            "status_list": status_list
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching player equipment status: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch player equipment status: {str(e)}")

@router.post("/deliver")
async def deliver_equipment(payload: dict):
    """
    Mark an equipment as delivered. Creates a record in the 'kit_assignments' table.
    Expects: player_id, player_name, item_name, item_type, size, quantity
    """
    academy_id = academy_id_ctx.get()
    try:
        player_id = payload.get("player_id")
        item_name = payload.get("item_name")
        
        # 1. Fetch player details to get correct full name and parent_id
        player_res = await supabase._get(f"/rest/v1/players?user_id=eq.{player_id}&select=parent_id,users(full_name)")
        
        player_name = payload.get("player_name")
        parent_id = None
        if player_res:
            parent_id = player_res[0].get("parent_id")
            if not player_name:
                player_name = player_res[0].get("users", {}).get("full_name") or "Unknown Player"
        
        # 2. Insert record into kit_assignments
        kit_data = {
            "academy_id": academy_id,
            "player_id": player_id,
            "player_name": player_name,
            "item_name": item_name,
            "item_type": payload.get("item_type", "Kit"),
            "size": payload.get("size", "M"),
            "quantity": payload.get("quantity", 1),
            "status": "Assigned",
            "assigned_date": datetime.datetime.now().strftime("%Y-%m-%d")
        }
        res = await supabase._post("/rest/v1/kit_assignments", kit_data)
        
        # 3. Trigger automatic notification to parent
        if parent_id:
            try:
                title_ar = "تحديث تسليم الألبسة"
                message_ar = f"تم تسليم قطعة الألبسة '{item_name}' للابن(ة) {player_name} بنجاح ✓"
                
                await supabase.insert_notification({
                    "user_id": parent_id,
                    "title": title_ar,
                    "message": message_ar,
                    "type": "equipment"
                })
                logger.info(f"Notification triggered for parent {parent_id} for delivery of {item_name} to {player_name}")
            except Exception as notif_err:
                logger.error("Failed to send parent notification on delivery: %s", notif_err)
                
        return res
    except Exception as e:
        logger.error("Error delivering equipment: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to deliver equipment: {str(e)}")

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from core.context import academy_id_ctx
from services.supabase_client import supabase
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/equipment", tags=["Equipment"])

class EquipmentSettingCreate(BaseModel):
    plan_name: str
    entitlements: List[str]

class EquipmentSettingUpdate(BaseModel):
    entitlements: List[str]

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
    academy_id = academy_id_ctx.get()
    try:
        # Fetch all players
        players = await supabase._get("/rest/v1/players?select=*")
        if not players: return []
        
        # Fetch all payments for plan mapping (could be optimized)
        payments = await supabase._get("/rest/v1/finances_payments?select=user_id,subscription_type,created_at&order=created_at.desc")
        
        # Fetch all equipment settings
        settings = await supabase._get("/rest/v1/equipment_settings?select=plan_name,entitlements")
        
        # Fetch all delivered kits
        kits = await supabase._get("/rest/v1/kits?select=*")
        
        # Map settings
        settings_map = {s.get("plan_name"): s.get("entitlements", []) for s in (settings or [])}
        
        results = []
        for p in players:
            p_id = p.get("user_id")
            
            # Find latest plan
            p_payments = [pm for pm in (payments or []) if pm.get("user_id") == p_id]
            plan_name = p_payments[0].get("subscription_type") if p_payments else "Free"
            
            entitlements = settings_map.get(plan_name, [])
            
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
                
            results.append({
                "player_id": p_id,
                "player_name": p.get("full_name"),
                "plan_name": plan_name,
                "entitlements": entitlements,
                "status_list": status_list
            })
            
        return results
    except Exception as e:
        logger.error("Error fetching all players equipment status: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch all players equipment status")

@router.get("/player-status/{player_id}")
async def get_player_equipment_status(player_id: str):
    """
    Get the equipment status for a specific player based on their subscription plan.
    Returns the items they are entitled to, and which ones have been delivered (from kits table).
    """
    try:
        # 1. Get player subscription plan
        # We need to find the latest payment/subscription for the player
        # In a real scenario, this comes from players or finances table
        # Let's get the player first
        players_res = await supabase._get(f"/rest/v1/players?user_id=eq.{player_id}&select=*")
        if not players_res:
            raise HTTPException(status_code=404, detail="Player not found")
        player = players_res[0]
        
        # 2. Find their plan (we'll fetch from finances_payments where user_id=player_id)
        # Order by created_at desc to get the latest
        payments = await supabase._get(f"/rest/v1/finances_payments?user_id=eq.{player_id}&order=created_at.desc&limit=1")
        
        plan_name = "Free" # Default
        if payments and len(payments) > 0:
            plan_name = payments[0].get("subscription_type") or "Free"
            
        # 3. Get equipment entitlements for this plan
        settings = await supabase._get(f"/rest/v1/equipment_settings?plan_name=eq.{plan_name}&select=entitlements")
        entitlements = []
        if settings and len(settings) > 0:
            entitlements = settings[0].get("entitlements", [])
            
        # 4. Get items already assigned/delivered to this player in the 'kits' table
        delivered_kits = await supabase._get(f"/rest/v1/kits?player_id=eq.{player_id}&select=*")
        delivered_items = []
        if delivered_kits:
            # Consider an item delivered if status is 'Assigned' or 'Returned' (meaning they got it)
            # You can customize this based on your logic
            delivered_items = [k for k in delivered_kits if k.get("status") in ["Assigned", "Returned"]]
            
        # 5. Build the status list
        # For each entitlement, check if it's in the delivered list (by item_name or item_type)
        status_list = []
        delivered_names = [k.get("item_name", "").lower() for k in delivered_items]
        delivered_types = [k.get("item_type", "").lower() for k in delivered_items]
        
        for item in entitlements:
            item_lower = item.lower()
            # Try to match by exact name or type
            is_delivered = False
            matching_kit = None
            
            for kit in delivered_items:
                if kit.get("item_name", "").lower() == item_lower or kit.get("item_type", "").lower() == item_lower:
                    is_delivered = True
                    matching_kit = kit
                    break
                    
            status_list.append({
                "item_name": item,
                "status": matching_kit.get("status") if matching_kit else "Pending",
                "assigned_date": matching_kit.get("assigned_date") if matching_kit else None,
                "kit_id": matching_kit.get("id") if matching_kit else None
            })
            
        return {
            "player_id": player_id,
            "player_name": player.get("full_name"),
            "plan_name": plan_name,
            "entitlements": entitlements,
            "status_list": status_list
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching player equipment status: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch player equipment status")

@router.post("/deliver")
async def deliver_equipment(payload: dict):
    """
    Mark an equipment as delivered. Creates a record in the 'kits' table.
    Expects: player_id, player_name, item_name, item_type
    """
    academy_id = academy_id_ctx.get()
    try:
        import datetime
        kit_data = {
            "academy_id": academy_id,
            "player_id": payload.get("player_id"),
            "player_name": payload.get("player_name"),
            "item_name": payload.get("item_name"),
            "item_type": payload.get("item_type", "Kit"),
            "size": payload.get("size", "M"),
            "quantity": payload.get("quantity", 1),
            "status": "Assigned",
            "assigned_date": datetime.datetime.now().strftime("%Y-%m-%d")
        }
        res = await supabase._post("/rest/v1/kits", kit_data)
        return res
    except Exception as e:
        logger.error("Error delivering equipment: %s", e)
        raise HTTPException(status_code=500, detail="Failed to deliver equipment")

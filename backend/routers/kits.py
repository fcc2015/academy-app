from fastapi import APIRouter, Depends, HTTPException
from core.auth_middleware import verify_token
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
from services.supabase_client import supabase

import logging
logger = logging.getLogger("kits")

router = APIRouter(prefix="/kits", tags=["Kits"], dependencies=[Depends(verify_token)])

class KitAssignmentBase(BaseModel):
    player_id: Optional[str] = None
    player_name: Optional[str] = None
    item_name: str
    item_type: Optional[str] = "Kit"
    size: Optional[str] = None
    quantity: Optional[int] = 1
    assigned_date: Optional[date] = None
    returned_date: Optional[date] = None
    status: Optional[str] = "Assigned"
    notes: Optional[str] = None

class KitAssignmentCreate(KitAssignmentBase): pass
class KitAssignmentUpdate(BaseModel):
    player_id: Optional[str] = None
    player_name: Optional[str] = None
    item_name: Optional[str] = None
    item_type: Optional[str] = None
    size: Optional[str] = None
    quantity: Optional[int] = None
    assigned_date: Optional[date] = None
    returned_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None

@router.get("/")
async def get_kit_assignments():
    try: return await supabase.get_kit_assignments()
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

@router.get("/player/{player_id}")
async def get_kits_by_player(player_id: str):
    try: return await supabase.get_kit_assignments_by_player(player_id)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

@router.post("/")
async def create_kit_assignment(item: KitAssignmentCreate):
    try:
        data = item.model_dump()
        if data.get('assigned_date'): data['assigned_date'] = str(data['assigned_date'])
        if data.get('returned_date'): data['returned_date'] = str(data['returned_date'])
        return await supabase.insert_kit_assignment(data)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

@router.patch("/{item_id}")
async def update_kit_assignment(item_id: str, item: KitAssignmentUpdate):
    try:
        data = item.model_dump(exclude_unset=True)
        if data.get('assigned_date'): data['assigned_date'] = str(data['assigned_date'])
        if data.get('returned_date'): data['returned_date'] = str(data['returned_date'])
        return await supabase.update_kit_assignment(item_id, data)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

@router.delete("/{item_id}")
async def delete_kit_assignment(item_id: str):
    try: return await supabase.delete_kit_assignment(item_id)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

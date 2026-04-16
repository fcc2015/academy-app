from fastapi import APIRouter, Depends, HTTPException
from core.auth_middleware import verify_token
from typing import List
from schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse
from services.supabase_client import supabase

import logging
logger = logging.getLogger("inventory")

router = APIRouter(prefix="/inventory", tags=["Inventory"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[InventoryResponse])
async def get_all_inventory():
    try:
        return await supabase.get_inventory()
    except Exception as e:
        logger.error("Error fetching inventory: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.post("/", response_model=InventoryResponse)
async def create_inventory_item(item: InventoryCreate):
    try:
        data = item.model_dump()
        result = await supabase.insert_inventory_item(data)
        return result[0] if isinstance(result, list) and result else result
    except Exception as e:
        logger.error("Error creating item: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.patch("/{item_id}", response_model=InventoryResponse)
async def update_inventory_item(item_id: str, item: InventoryUpdate):
    try:
        data = item.model_dump(exclude_unset=True)
        return await supabase.update_inventory_item(item_id, data)
    except Exception as e:
        logger.error("Error updating item: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

@router.delete("/{item_id}")
async def delete_inventory_item(item_id: str):
    try:
        return await supabase.delete_inventory_item(item_id)
    except Exception as e:
        logger.error("Error deleting item: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

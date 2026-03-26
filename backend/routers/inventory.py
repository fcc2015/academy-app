from fastapi import APIRouter, HTTPException
from typing import List
from schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse
from services.supabase_client import supabase

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("/", response_model=List[InventoryResponse])
async def get_all_inventory():
    try:
        return await supabase.get_inventory()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching inventory: {str(e)}")

@router.post("/", response_model=InventoryResponse)
async def create_inventory_item(item: InventoryCreate):
    try:
        data = item.model_dump()
        result = await supabase.insert_inventory_item(data)
        return result[0] if isinstance(result, list) and result else result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating item: {str(e)}")

@router.patch("/{item_id}", response_model=InventoryResponse)
async def update_inventory_item(item_id: str, item: InventoryUpdate):
    try:
        data = item.model_dump(exclude_unset=True)
        return await supabase.update_inventory_item(item_id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating item: {str(e)}")

@router.delete("/{item_id}")
async def delete_inventory_item(item_id: str):
    try:
        return await supabase.delete_inventory_item(item_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting item: {str(e)}")

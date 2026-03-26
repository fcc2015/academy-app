from fastapi import APIRouter, HTTPException
from typing import List
from schemas.injuries import InjuryCreate, InjuryUpdate, InjuryResponse
from services.supabase_client import supabase

router = APIRouter(prefix="/injuries", tags=["Injuries"])

@router.get("/", response_model=List[InjuryResponse])
async def get_all_injuries():
    try:
        return await supabase.get_injuries()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching injuries: {str(e)}")

@router.post("/", response_model=InjuryResponse)
async def create_injury(injury: InjuryCreate):
    try:
        data = injury.model_dump()
        data['injury_date'] = data['injury_date'].isoformat()
        if data.get('expected_recovery_date'):
            data['expected_recovery_date'] = data['expected_recovery_date'].isoformat()
        result = await supabase.insert_injury(data)
        return result[0] if isinstance(result, list) and result else result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating injury: {str(e)}")

@router.patch("/{injury_id}", response_model=InjuryResponse)
async def update_injury(injury_id: str, injury: InjuryUpdate):
    try:
        data = injury.model_dump(exclude_unset=True)
        if 'injury_date' in data and data['injury_date']:
            data['injury_date'] = data['injury_date'].isoformat()
        if 'expected_recovery_date' in data and data['expected_recovery_date']:
            data['expected_recovery_date'] = data['expected_recovery_date'].isoformat()
        result = await supabase.update_injury(injury_id, data)
        return result[0] if isinstance(result, list) and result else result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating injury: {str(e)}")

@router.delete("/{injury_id}")
async def delete_injury(injury_id: str):
    try:
        return await supabase.delete_injury(injury_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting injury: {str(e)}")

from fastapi import APIRouter, Depends, HTTPException
from core.auth_middleware import verify_token
from typing import Optional
from pydantic import BaseModel
from datetime import date
from services.supabase_client import supabase

import logging
logger = logging.getLogger("medical")

router = APIRouter(prefix="/medical", tags=["Medical"], dependencies=[Depends(verify_token)])

class MedicalRecordBase(BaseModel):
    player_id: str
    player_name: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    last_medical_checkup: Optional[date] = None
    notes: Optional[str] = None

class MedicalRecordCreate(MedicalRecordBase): pass
class MedicalRecordUpdate(BaseModel):
    player_name: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    last_medical_checkup: Optional[date] = None
    notes: Optional[str] = None

@router.get("/")
async def get_all_medical_records():
    try: return await supabase.get_medical_records()
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

@router.get("/player/{player_id}")
async def get_medical_record_by_player(player_id: str):
    try: return await supabase.get_medical_record_by_player(player_id)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

@router.post("/")
async def create_medical_record(record: MedicalRecordCreate):
    try:
        data = record.model_dump()
        if data.get('last_medical_checkup'): data['last_medical_checkup'] = str(data['last_medical_checkup'])
        return await supabase.upsert_medical_record(data)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

@router.patch("/{record_id}")
async def update_medical_record(record_id: str, record: MedicalRecordUpdate):
    try:
        data = record.model_dump(exclude_unset=True)
        if data.get('last_medical_checkup'): data['last_medical_checkup'] = str(data['last_medical_checkup'])
        return await supabase.update_medical_record(record_id, data)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

@router.delete("/{record_id}")
async def delete_medical_record(record_id: str):
    try: return await supabase.delete_medical_record(record_id)
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(500, detail="An internal error occurred. Please try again.")

from pydantic import BaseModel
from typing import Optional
from datetime import date

# Base schema for fetching User data
class UserBase(BaseModel):
    id: str
    full_name: str
    role: str

# Schema for creating/updating Players
class PlayerCreate(BaseModel):
    user_id: str
    full_name: Optional[str] = None
    birth_date: date
    technical_level: Optional[str] = "B" # A or B
    subscription_type: str # Golden, Silver, Copper, Free, Monthly, Annual
    discount_type: Optional[str] = None # percentage, fixed
    discount_value: Optional[float] = None
    u_category: str 
    parent_name: str
    parent_whatsapp: str
    address: Optional[str] = None
    account_status: str = "Pending"
    photo_url: Optional[str] = None
    parent_id: Optional[str] = None
    blood_type: Optional[str] = None
    medical_cert_valid_until: Optional[date] = None
    transport_zone: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact: Optional[str] = None

class PlayerResponse(PlayerCreate):
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True


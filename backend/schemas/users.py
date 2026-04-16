from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import date
import re

# Base schema for fetching User data
class UserBase(BaseModel):
    id: str
    full_name: str
    role: str

# Schema for creating/updating Players
class PlayerCreate(BaseModel):
    user_id: str
    full_name: Optional[str] = Field(None, max_length=100)
    birth_date: date
    technical_level: Optional[Literal['A', 'B']] = "B"
    subscription_type: Literal['Golden', 'Silver', 'Copper', 'Free', 'Monthly', 'Annual']
    discount_type: Optional[Literal['percentage', 'fixed']] = None
    discount_value: Optional[float] = Field(None, ge=0)
    u_category: str = Field(..., min_length=1, max_length=20)
    parent_name: str = Field(..., min_length=2, max_length=100)
    parent_whatsapp: str = Field(..., pattern=r"^\+?[0-9]{8,15}$", description="Valid phone number")
    address: Optional[str] = Field(None, max_length=300)
    account_status: Literal['Pending', 'Active', 'Inactive', 'Suspended'] = "Pending"
    photo_url: Optional[str] = Field(None, max_length=500)
    parent_id: Optional[str] = None
    blood_type: Optional[str] = Field(None, max_length=5)
    medical_cert_valid_until: Optional[date] = None
    transport_zone: Optional[str] = Field(None, max_length=100)
    allergies: Optional[str] = Field(None, max_length=500)
    emergency_contact: Optional[str] = Field(None, max_length=200)

    @field_validator("full_name", "parent_name", "address", "allergies", "emergency_contact")
    @classmethod
    def strip_html(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return re.sub(r"<[^>]+>", "", v).strip()
        return v

class PlayerResponse(PlayerCreate):
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True


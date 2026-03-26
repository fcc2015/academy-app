from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AcademySettingsBase(BaseModel):
    academy_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    registration_fee: float = 500.0
    monthly_subscription: float = 300.0
    annual_subscription: float = 3000.0
    subscription_model: str = "monthly"
    enable_prorata: bool = False
    currency: str = "MAD"
    logo_url: Optional[str] = None
    address: Optional[str] = None
    age_categories: list[str] = ["U5", "U7", "U9", "U11", "U13", "U15", "U17", "U19", "Senior"]
    season_start: Optional[str] = None
    season_end: Optional[str] = None

class AcademySettingsUpdate(BaseModel):
    academy_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    registration_fee: Optional[float] = None
    monthly_subscription: Optional[float] = None
    annual_subscription: Optional[float] = None
    subscription_model: Optional[str] = None
    enable_prorata: Optional[bool] = None
    currency: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    age_categories: Optional[list[str]] = None
    season_start: Optional[str] = None
    season_end: Optional[str] = None

class AcademySettingsResponse(AcademySettingsBase):
    id: str
    updated_at: datetime

    class Config:
        from_attributes = True

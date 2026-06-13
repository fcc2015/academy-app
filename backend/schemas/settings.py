from pydantic import BaseModel
from typing import Optional, Any
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
    prorata_start_month: int = 1
    prorata_discount_percentage: int = 30
    currency: str = "MAD"
    logo_url: Optional[str] = None
    address: Optional[str] = None
    age_categories: list[str] = ["U5", "U7", "U9", "U11", "U13", "U15", "U17", "U19", "Senior"]
    season_start: Optional[str] = None
    season_end: Optional[str] = None
    # Terrains: list of { name: str, size: str } e.g. {"name":"Terrain 1","size":"5/5"}
    terrains: Optional[list[dict[str, Any]]] = None
    # Pre-defined tournaments academy participates in (for match scheduler dropdown)
    tournaments_list: Optional[list[str]] = None
    # Public landing page content
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    about_text: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    youtube_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    bank_rib: Optional[str] = None
    wafacash_details: Optional[str] = None
    cashplus_details: Optional[str] = None
    family_discount_percentage: int = 10
    primary_color: str = "#4f46e5"
    secondary_color: str = "#7c3aed"
    whatsapp_absence_alert: bool = True
    whatsapp_payment_reminder: bool = True
    whatsapp_language: str = "ar"

class AcademySettingsUpdate(BaseModel):
    academy_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    registration_fee: Optional[float] = None
    monthly_subscription: Optional[float] = None
    annual_subscription: Optional[float] = None
    subscription_model: Optional[str] = None
    enable_prorata: Optional[bool] = None
    prorata_start_month: Optional[int] = None
    prorata_discount_percentage: Optional[int] = None
    currency: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    age_categories: Optional[list[str]] = None
    season_start: Optional[str] = None
    season_end: Optional[str] = None
    terrains: Optional[list[dict[str, Any]]] = None
    tournaments_list: Optional[list[str]] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    about_text: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    youtube_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    bank_rib: Optional[str] = None
    wafacash_details: Optional[str] = None
    cashplus_details: Optional[str] = None
    family_discount_percentage: Optional[int] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    whatsapp_absence_alert: Optional[bool] = None
    whatsapp_payment_reminder: Optional[bool] = None
    whatsapp_language: Optional[str] = None

class AcademySettingsResponse(AcademySettingsBase):
    id: str
    updated_at: datetime

    class Config:
        from_attributes = True

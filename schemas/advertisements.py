from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import re

class AdCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    media_url: str = Field(..., min_length=1, max_length=1000)
    link_url: Optional[str] = Field(None, max_length=1000)
    target_roles: List[str] = []
    target_categories: List[str] = []
    is_active: bool = True
    ad_type: str = Field("general", pattern="^(general|pro|1to1)$")

    @field_validator("title")
    @classmethod
    def strip_html(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return re.sub(r"<[^>]+>", "", v).strip()
        return v

class AdResponse(AdCreate):
    id: str
    academy_id: Optional[str] = None
    views_count: int = 0
    clicks_count: int = 0
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

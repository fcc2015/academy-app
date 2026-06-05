from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
import re

class StoryCreate(BaseModel):
    media_url: Optional[str] = Field(None, max_length=1000)
    media_type: Literal['image', 'video', 'text'] = 'image'
    caption: Optional[str] = Field(None, max_length=500)

    @field_validator("caption")
    @classmethod
    def strip_html(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return re.sub(r"<[^>]+>", "", v).strip()
        return v

class StoryResponse(StoryCreate):
    id: str
    academy_id: Optional[str] = None
    user_id: Optional[str] = None
    expires_at: Optional[str] = None
    created_at: Optional[str] = None
    # Joined fields
    full_name: Optional[str] = None
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True

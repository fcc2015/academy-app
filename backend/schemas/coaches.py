from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime

class CoachBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9]{8,15}$", description="Valid phone number")
    specialization: str = Field(..., min_length=1, max_length=100)
    status: Literal['Active', 'Inactive', 'Suspended'] = "Active"

class CoachCreate(CoachBase):
    pass

class CoachResponse(CoachBase):
    id: str
    user_id: Optional[str] = None
    created_at: datetime
    temp_password: Optional[str] = None

    class Config:
        from_attributes = True

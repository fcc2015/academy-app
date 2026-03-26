from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class CoachBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    specialization: str
    status: str = "Active"

class CoachCreate(CoachBase):
    pass

class CoachResponse(CoachBase):
    id: str
    user_id: Optional[str] = None
    created_at: datetime
    temp_password: Optional[str] = None

    class Config:
        from_attributes = True

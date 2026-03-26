from pydantic import BaseModel, EmailStr
from typing import Optional, Dict

class AdminCreate(BaseModel):
    full_name: str
    email: EmailStr
    permissions: Dict[str, bool]
    status: Optional[str] = "Active"
    admin_type: Optional[str] = "admin"  # admin | employee | accountant

class AdminResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    full_name: str
    email: EmailStr
    permissions: Dict[str, bool]
    status: str
    admin_type: Optional[str] = "admin"
    created_at: Optional[str] = None
    temp_password: Optional[str] = None

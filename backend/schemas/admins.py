from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Literal

class AdminCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    permissions: Dict[str, bool]
    status: Optional[Literal['Active', 'Inactive', 'Suspended']] = "Active"
    admin_type: Optional[Literal['admin', 'employee', 'accountant']] = "admin"

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

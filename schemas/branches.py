from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class BranchCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="اسم الفرع")
    city: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=300)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: bool = True


class BranchUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=300)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class BranchResponse(BaseModel):
    id: str
    academy_id: str
    name: str
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class SousAdminBranchAssign(BaseModel):
    user_id: str
    branch_id: str

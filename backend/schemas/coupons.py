from pydantic import BaseModel
from typing import Optional

class CouponCreate(BaseModel):
    code: str
    discount_type: str # 'percentage' or 'fixed'
    discount_value: float
    is_active: bool = True

class CouponResponse(BaseModel):
    id: str
    code: str
    discount_type: str
    discount_value: float
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True

class CouponValidate(BaseModel):
    code: str

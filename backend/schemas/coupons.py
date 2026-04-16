from pydantic import BaseModel, Field
from typing import Optional, Literal

class CouponCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=50, pattern=r"^[A-Z0-9_\-]+$")
    discount_type: Literal['percentage', 'fixed']
    discount_value: float = Field(..., gt=0)
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
    code: str = Field(..., min_length=3, max_length=50, pattern=r"^[A-Z0-9_\-]+$")

from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID


class SubscriptionPlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    monthly_price: Optional[float] = Field(None, ge=0)
    annual_price: Optional[float] = Field(None, ge=0)
    billing_cycles: Optional[List[str]] = ['monthly']
    features: Optional[List[str]] = []
    is_active: Optional[bool] = True
    color: Optional[str] = Field('gold', max_length=50)
    sort_order: Optional[int] = Field(0, ge=0)


class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    monthly_price: Optional[float] = Field(None, ge=0)
    annual_price: Optional[float] = Field(None, ge=0)
    billing_cycles: Optional[List[str]] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None
    color: Optional[str] = Field(None, max_length=50)
    sort_order: Optional[int] = Field(None, ge=0)


class SubscriptionPlanOut(SubscriptionPlanBase):
    id: UUID

    class Config:
        from_attributes = True

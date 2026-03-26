from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class SubscriptionPlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    monthly_price: Optional[float] = None
    annual_price: Optional[float] = None
    billing_cycles: Optional[List[str]] = ['monthly']
    features: Optional[List[str]] = []
    is_active: Optional[bool] = True
    color: Optional[str] = 'gold'
    sort_order: Optional[int] = 0


class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    monthly_price: Optional[float] = None
    annual_price: Optional[float] = None
    billing_cycles: Optional[List[str]] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None


class SubscriptionPlanOut(SubscriptionPlanBase):
    id: UUID

    class Config:
        from_attributes = True

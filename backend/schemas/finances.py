from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class PaymentCreate(BaseModel):
    user_id: str
    amount: float
    payment_date: Optional[datetime] = None
    status: str = "Completed"
    payment_method: str = "Cash"
    notes: Optional[str] = None
    # New fields
    billing_type: Optional[str] = "monthly"
    due_date: Optional[date] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    invoice_number: Optional[str] = None
    amount_due: Optional[float] = None
    alert_status: Optional[str] = "none"
    player_id: Optional[str] = None


class PaymentResponse(PaymentCreate):
    id: str

    class Config:
        from_attributes = True


class SubscriptionCreate(BaseModel):
    player_id: str
    user_id: Optional[str] = None
    billing_type: str = "monthly"  # monthly, annual, hybrid, prorata
    start_date: date
    monthly_amount: float
    annual_amount: Optional[float] = None
    notes: Optional[str] = None


class SubscriptionResponse(BaseModel):
    id: str
    player_id: str
    user_id: Optional[str] = None
    billing_type: str
    start_date: date
    next_due_date: date
    monthly_amount: float
    annual_amount: Optional[float] = None
    prorata_days: Optional[int] = None
    prorata_amount: Optional[float] = None
    status: str
    alert_status: str
    notes: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    amount: float
    category: str # 'Salaires', 'Équipement', 'Loyer', 'Transport', 'Autre'
    description: Optional[str] = None
    expense_date: Optional[date] = None

class ExpenseCreate(ExpenseBase):
    created_by: Optional[str] = None

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    expense_date: Optional[date] = None

class ExpenseResponse(ExpenseBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

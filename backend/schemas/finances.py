from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, date

PaymentStatus = Literal['Completed', 'Pending', 'Cancelled', 'Refunded']
PaymentMethod = Literal['Cash', 'Card', 'Transfer', 'Online', 'Other']
BillingType = Literal['monthly', 'annual', 'hybrid', 'prorata']
AlertStatus = Literal['none', 'due_soon', 'overdue', 'paid']

class PaymentCreate(BaseModel):
    user_id: str
    amount: float = Field(..., gt=0)
    payment_date: Optional[datetime] = None
    status: PaymentStatus = "Completed"
    payment_method: PaymentMethod = "Cash"
    notes: Optional[str] = Field(None, max_length=1000)
    # New fields
    billing_type: Optional[BillingType] = "monthly"
    due_date: Optional[date] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    invoice_number: Optional[str] = Field(None, max_length=100)
    amount_due: Optional[float] = Field(None, ge=0)
    alert_status: Optional[AlertStatus] = "none"
    player_id: Optional[str] = None


class PaymentResponse(PaymentCreate):
    id: str

    class Config:
        from_attributes = True


class SubscriptionCreate(BaseModel):
    player_id: str
    user_id: Optional[str] = None
    billing_type: BillingType = "monthly"
    start_date: date
    monthly_amount: float = Field(..., gt=0)
    annual_amount: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = Field(None, max_length=1000)


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

ExpenseCategory = Literal['Salaires', 'Équipement', 'Loyer', 'Transport', 'Autre']

class ExpenseBase(BaseModel):
    amount: float = Field(..., gt=0)
    category: ExpenseCategory
    description: Optional[str] = Field(None, max_length=1000)
    expense_date: Optional[date] = None

class ExpenseCreate(ExpenseBase):
    created_by: Optional[str] = None

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[ExpenseCategory] = None
    description: Optional[str] = Field(None, max_length=1000)
    expense_date: Optional[date] = None

class ExpenseResponse(ExpenseBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

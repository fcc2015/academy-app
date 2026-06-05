from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date, datetime

class SanctionCreate(BaseModel):
    player_id: str
    player_name: str
    sanction_type: Literal['Warning', 'Suspension', 'Fine', 'Match_Ban'] = 'Warning'
    amount: Optional[float] = 0.0
    reason: str = Field(..., min_length=3, max_length=1000)
    report_text: Optional[str] = Field(None, max_length=3000)
    end_date: Optional[date] = None

class SanctionApprove(BaseModel):
    approved: bool

class SanctionResponse(BaseModel):
    id: str
    academy_id: Optional[str] = None
    player_id: str
    player_name: str
    coach_id: Optional[str] = None
    coach_name: Optional[str] = None
    sanction_type: str
    amount: float = 0.0
    status: str
    reason: str
    report_text: Optional[str] = None
    created_at: Optional[str] = None
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None
    end_date: Optional[str] = None

    class Config:
        from_attributes = True

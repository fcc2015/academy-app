from pydantic import BaseModel, Field
from typing import Optional
from datetime import date as date_type, datetime

class EvaluationBase(BaseModel):
    player_id: str
    coach_id: Optional[str] = None
    evaluation_date: Optional[date_type] = None
    technical_score: int = Field(..., ge=0, le=10)
    tactical_score: int = Field(..., ge=0, le=10)
    physical_score: int = Field(..., ge=0, le=10)
    mental_score: int = Field(..., ge=0, le=10)
    notes: Optional[str] = Field(None, max_length=2000)

class EvaluationCreate(EvaluationBase):
    pass

class EvaluationResponse(EvaluationBase):
    id: str
    created_at: datetime
    overall_rating: Optional[float] = None
    players: Optional[dict] = None

    class Config:
        from_attributes = True

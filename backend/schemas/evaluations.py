from pydantic import BaseModel
from typing import Optional
from datetime import date as date_type, datetime

class EvaluationBase(BaseModel):
    player_id: str
    coach_id: Optional[str] = None
    evaluation_date: Optional[date_type] = None
    technical_score: int
    tactical_score: int
    physical_score: int
    mental_score: int
    notes: Optional[str] = None

class EvaluationCreate(EvaluationBase):
    pass

class EvaluationResponse(EvaluationBase):
    id: str
    created_at: datetime
    overall_rating: Optional[float] = None
    players: Optional[dict] = None

    class Config:
        from_attributes = True

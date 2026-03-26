from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MatchBase(BaseModel):
    squad_id: Optional[str] = None
    coach_id: Optional[str] = None
    category: Optional[str] = None
    opponent_name: str
    match_date: datetime
    location: Optional[str] = None
    our_score: Optional[int] = 0
    their_score: Optional[int] = 0
    match_type: str # 'Friendly', 'League', 'Cup', 'Tournament'
    status: str = 'Scheduled' # 'Scheduled', 'Completed', 'Cancelled'
    notes: Optional[str] = None
    convoked_players: list[str] = []

class MatchCreate(MatchBase):
    pass

class MatchUpdate(BaseModel):
    squad_id: Optional[str] = None
    coach_id: Optional[str] = None
    category: Optional[str] = None
    opponent_name: Optional[str] = None
    match_date: Optional[datetime] = None
    location: Optional[str] = None
    our_score: Optional[int] = None
    their_score: Optional[int] = None
    match_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    convoked_players: Optional[list[str]] = None

class MatchResponse(MatchBase):
    id: str
    created_at: datetime
    squads: Optional[dict] = None

    class Config:
        from_attributes = True

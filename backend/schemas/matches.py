from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
import re

MatchType = Literal['Friendly', 'League', 'Cup', 'Tournament']
MatchStatus = Literal['Scheduled', 'Completed', 'Cancelled', 'Postponed']

class MatchBase(BaseModel):
    squad_id: Optional[str] = None
    coach_id: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)
    opponent_name: str = Field(..., min_length=1, max_length=100)
    match_date: datetime
    location: Optional[str] = Field(None, max_length=200)
    our_score: Optional[int] = Field(0, ge=0)
    their_score: Optional[int] = Field(0, ge=0)
    match_type: MatchType
    status: MatchStatus = 'Scheduled'
    notes: Optional[str] = Field(None, max_length=2000)
    convoked_players: list[str] = []

    @field_validator("opponent_name", "location", "notes")
    @classmethod
    def strip_html(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return re.sub(r"<[^>]+>", "", v).strip()
        return v

class MatchCreate(MatchBase):
    pass

class MatchUpdate(BaseModel):
    squad_id: Optional[str] = None
    coach_id: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)
    opponent_name: Optional[str] = Field(None, min_length=1, max_length=100)
    match_date: Optional[datetime] = None
    location: Optional[str] = Field(None, max_length=200)
    our_score: Optional[int] = Field(None, ge=0)
    their_score: Optional[int] = Field(None, ge=0)
    match_type: Optional[MatchType] = None
    status: Optional[MatchStatus] = None
    notes: Optional[str] = Field(None, max_length=2000)
    convoked_players: Optional[list[str]] = None

class MatchResponse(MatchBase):
    id: str
    created_at: datetime
    squads: Optional[dict] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SquadBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=50)
    coach_id: Optional[str] = None
    schedule: Optional[str] = Field(None, max_length=500)
    max_players: int = Field(20, ge=1, le=100)

class SquadCreate(SquadBase):
    pass

class SquadUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    coach_id: Optional[str] = None
    schedule: Optional[str] = Field(None, max_length=500)
    max_players: Optional[int] = Field(None, ge=1, le=100)

class SquadResponse(SquadBase):
    id: str
    created_at: datetime
    # We might join the coach name in from Supabase
    # coach_name: Optional[str] = None

    class Config:
        from_attributes = True

class RosterUpdate(BaseModel):
    player_ids: list[str]


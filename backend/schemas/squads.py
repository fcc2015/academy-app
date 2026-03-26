from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SquadBase(BaseModel):
    name: str
    category: str
    coach_id: Optional[str] = None
    schedule: Optional[str] = None
    max_players: int = 20

class SquadCreate(SquadBase):
    pass

class SquadUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    coach_id: Optional[str] = None
    schedule: Optional[str] = None
    max_players: Optional[int] = None

class SquadResponse(SquadBase):
    id: str
    created_at: datetime
    # We might join the coach name in from Supabase
    # coach_name: Optional[str] = None

    class Config:
        from_attributes = True

class RosterUpdate(BaseModel):
    player_ids: list[str]


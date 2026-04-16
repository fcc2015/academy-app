from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date as date_type, datetime

class InjuryBase(BaseModel):
    player_id: str
    injury_date: date_type
    description: str = Field(..., min_length=1, max_length=2000)
    expected_recovery_date: Optional[date_type] = None
    status: Literal['Active', 'Recovered'] = 'Active'

class InjuryCreate(InjuryBase):
    pass

class InjuryUpdate(BaseModel):
    injury_date: Optional[date_type] = None
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    expected_recovery_date: Optional[date_type] = None
    status: Optional[Literal['Active', 'Recovered']] = None

class InjuryResponse(InjuryBase):
    id: str
    created_at: datetime
    players: Optional[dict] = None # Joining player relation if needed

    class Config:
        from_attributes = True

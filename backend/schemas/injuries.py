from pydantic import BaseModel
from typing import Optional
from datetime import date as date_type, datetime

class InjuryBase(BaseModel):
    player_id: str
    injury_date: date_type
    description: str
    expected_recovery_date: Optional[date_type] = None
    status: str = 'Active' # 'Active', 'Recovered'

class InjuryCreate(InjuryBase):
    pass

class InjuryUpdate(BaseModel):
    injury_date: Optional[date_type] = None
    description: Optional[str] = None
    expected_recovery_date: Optional[date_type] = None
    status: Optional[str] = None

class InjuryResponse(InjuryBase):
    id: str
    created_at: datetime
    players: Optional[dict] = None # Joining player relation if needed

    class Config:
        from_attributes = True

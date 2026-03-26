from pydantic import BaseModel
from typing import Optional, List
from datetime import date as date_type, datetime

class AttendanceBase(BaseModel):
    squad_id: str
    player_id: str
    date: date_type
    status: str = 'present' # present, absent, late, excused
    notes: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class AttendanceResponse(AttendanceBase):
    id: str
    created_at: datetime
    # We may want to include player name when fetching the roster
    # player_name: Optional[str] = None

    class Config:
        from_attributes = True

class AttendanceBulkItem(BaseModel):
    player_id: str
    status: str
    notes: Optional[str] = None

class AttendanceBulkCreate(BaseModel):
    squad_id: str
    date: date_type
    records: List[AttendanceBulkItem]

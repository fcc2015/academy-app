from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import date as date_type, datetime

class AttendanceBase(BaseModel):
    squad_id: str
    player_id: str
    date: date_type
    status: Literal['present', 'absent', 'late', 'excused'] = 'present'
    notes: Optional[str] = Field(None, max_length=500)

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    status: Optional[Literal['present', 'absent', 'late', 'excused']] = None
    notes: Optional[str] = Field(None, max_length=500)

class AttendanceResponse(AttendanceBase):
    id: str
    created_at: datetime
    # We may want to include player name when fetching the roster
    # player_name: Optional[str] = None

    class Config:
        from_attributes = True

class AttendanceBulkItem(BaseModel):
    player_id: str
    status: Literal['present', 'absent', 'late', 'excused']
    notes: Optional[str] = Field(None, max_length=500)

class AttendanceBulkCreate(BaseModel):
    squad_id: str
    date: date_type
    records: List[AttendanceBulkItem]

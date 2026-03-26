from pydantic import BaseModel
from typing import Optional
from datetime import date, time, datetime

class EventBase(BaseModel):
    title: str
    type: str # 'Match', 'Training', 'Tournament', 'Other'
    event_date: date
    event_time: time
    location: str
    opponent: Optional[str] = None
    status: str = "Scheduled"

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    event_date: Optional[date] = None
    event_time: Optional[time] = None
    location: Optional[str] = None
    opponent: Optional[str] = None
    status: Optional[str] = None

class EventResponse(EventBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

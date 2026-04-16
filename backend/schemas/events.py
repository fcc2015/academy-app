from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date, time, datetime

EventType = Literal['Match', 'Training', 'Tournament', 'Tryouts', 'Meeting', 'Holiday', 'Other']
EventStatus = Literal['Scheduled', 'Completed', 'Cancelled', 'Postponed']

class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    type: EventType
    event_date: date
    event_time: time
    location: str = Field(..., min_length=1, max_length=200)
    opponent: Optional[str] = Field(None, max_length=100)
    status: EventStatus = "Scheduled"

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[EventType] = None
    event_date: Optional[date] = None
    event_time: Optional[time] = None
    location: Optional[str] = Field(None, min_length=1, max_length=200)
    opponent: Optional[str] = Field(None, max_length=100)
    status: Optional[EventStatus] = None

class EventResponse(EventBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

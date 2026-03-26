from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class InventoryBase(BaseModel):
    item_name: str
    category: str # 'Balls', 'Bibs', 'Cones', 'Jerseys', 'Medical', 'Other'
    quantity: int
    condition: str # 'New', 'Good', 'Fair', 'Poor', 'Lost'

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    item_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    condition: Optional[str] = None

class InventoryResponse(InventoryBase):
    id: str
    last_updated: datetime

    class Config:
        from_attributes = True

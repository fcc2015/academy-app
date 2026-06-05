from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

InventoryCategory = Literal['Balls', 'Bibs', 'Cones', 'Jerseys', 'Medical', 'Other']
InventoryCondition = Literal['New', 'Good', 'Fair', 'Poor', 'Lost']

class InventoryBase(BaseModel):
    item_name: str = Field(..., min_length=1, max_length=200)
    category: InventoryCategory
    quantity: int = Field(..., ge=0)
    condition: InventoryCondition

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    item_name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[InventoryCategory] = None
    quantity: Optional[int] = Field(None, ge=0)
    condition: Optional[InventoryCondition] = None

class InventoryResponse(InventoryBase):
    id: str
    last_updated: datetime

    class Config:
        from_attributes = True

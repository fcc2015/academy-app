from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
from datetime import date
from services.supabase_client import supabase

router = APIRouter(prefix="/expenses", tags=["Expenses"])

class ExpenseBase(BaseModel):
    title: str
    category: Optional[str] = "General"
    amount: float
    expense_date: Optional[date] = None
    paid_to: Optional[str] = None
    payment_method: Optional[str] = "Cash"
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    created_by: Optional[str] = None

class ExpenseCreate(ExpenseBase): pass
class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    expense_date: Optional[date] = None
    paid_to: Optional[str] = None
    payment_method: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None

@router.get("/")
async def get_expenses():
    try: return await supabase.get_expenses()
    except Exception as e: raise HTTPException(500, detail=str(e))

@router.post("/")
async def create_expense(expense: ExpenseCreate):
    try:
        data = expense.model_dump(mode='json')
        result = await supabase.insert_expense(data)
        return result[0] if isinstance(result, list) and result else result
    except Exception as e: raise HTTPException(500, detail=str(e))

@router.patch("/{expense_id}")
async def update_expense(expense_id: str, expense: ExpenseUpdate):
    try:
        data = expense.model_dump(exclude_unset=True, mode='json')
        return await supabase.update_expense(expense_id, data)
    except Exception as e: raise HTTPException(500, detail=str(e))

@router.delete("/{expense_id}")
async def delete_expense(expense_id: str):
    try: return await supabase.delete_expense(expense_id)
    except Exception as e: raise HTTPException(500, detail=str(e))

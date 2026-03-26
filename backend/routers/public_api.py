from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from services.supabase_client import supabase

router = APIRouter(prefix="/public", tags=["Public"])

class PublicRequest(BaseModel):
    type: str # 'contact' | 'registration'
    name: str
    email: Optional[str] = None
    player_name: Optional[str] = None
    birth_date: Optional[str] = None
    address: Optional[str] = None
    plan_name: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None

@router.post("/requests")
async def create_public_request(request: PublicRequest):
    try:
        response = await supabase.insert_public_request(request.model_dump())
        
        # Optional: trigger notification to admins
        try:
            subject = request.player_name if request.player_name else request.name
            msg = f"طلب جديد ({'تسجيل لاعب' if request.type == 'registration' else 'اتصال'}) من طرف {request.name}. "
            if request.player_name:
                msg += f"اللاعب: {request.player_name}. "
            if request.plan_name:
                msg += f"الباقة: {request.plan_name}. "
            if request.birth_date:
                msg += f"تاريخ الميلاد: {request.birth_date}. "
            if request.email:
                msg += f"({request.email})"
                
            await supabase.insert_notification({
                "title": f"طلب {'تسجيل' if request.type == 'registration' else 'تواصل'} جديد",
                "message": msg,
                "type": "admin_alert",
                "target_role": "Admin"
            })
        except Exception as e:
            err_details = getattr(e, "response", None)
            print(f"FAILED TO INSERT NOTIFICATION FROM PUBLIC API: {e}")
            if err_details:
                print(f"Details: {err_details.text}")
            pass # ignore notification failure
            
        return {"success": True, "message": "Request received successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving request: {str(e)}"
        )

@router.get("/admin/requests")
async def fetch_public_requests(request_status: str = "active"):
    try:
        data = await supabase.get_public_requests(status=request_status)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching requests: {str(e)}"
        )

class RequestUpdate(BaseModel):
    status: str

@router.patch("/admin/requests/{request_id}")
async def update_request_status(request_id: str, update: RequestUpdate):
    try:
        data = await supabase.update_public_request_status(request_id, update.status)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating request: {str(e)}"
        )

@router.delete("/admin/requests/{request_id}")
async def delete_public_request(request_id: str):
    try:
        data = await supabase.delete_public_request(request_id)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting request: {str(e)}"
        )

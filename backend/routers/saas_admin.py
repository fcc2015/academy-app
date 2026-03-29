from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from core.auth_middleware import require_role
from services.supabase_client import supabase

router = APIRouter(
    prefix="/saas",
    tags=["SaaS Admin"],
    dependencies=[Depends(require_role("super_admin"))]
)

class AcademyProvisionRequest(BaseModel):
    name: str
    subdomain: str | None = None
    admin_email: EmailStr
    admin_password: str
    admin_name: str

class AcademyStatusUpdate(BaseModel):
    status: str  # "active" or "suspended"

@router.get("/academies")
async def get_academies():
    """Get all academies for SaaS management."""
    res = await supabase._get("/rest/v1/academies?select=*&order=created_at.desc")
    return res

@router.post("/academies")
async def create_academy(req: AcademyProvisionRequest):
    """Clean provision of a new client academy and its root admin."""
    # 1. Create the Academy
    academy_data = {
        "name": req.name,
        "subdomain": req.subdomain,
        "status": "active"
    }
    
    res_academy = await supabase._post("/rest/v1/academies?select=id", academy_data)
    academy_row = res_academy[0] if isinstance(res_academy, list) else res_academy
    new_academy_id = academy_row["id"]

    try:
        # 2. Provision the Admin User via Auth Admin API (requires service_role key)
        auth_res = await supabase.admin_create_user(
            email=req.admin_email,
            password=req.admin_password,
            role="admin",
            full_name=req.admin_name,
            academy_id=new_academy_id
        )
        
        admin_user_id = auth_res.get("id")
        
        # 3. Create the public.users record (for FK relationships)
        try:
            await supabase._post("/rest/v1/users", {
                "id": admin_user_id,
                "user_id": admin_user_id,
                "full_name": req.admin_name,
                "role": "admin",
                "academy_id": new_academy_id
            })
        except Exception as e:
            print(f"Users record creation (non-critical): {e}")

        # 4. Create the public.admins record
        admin_data = {
            "user_id": admin_user_id,
            "email": req.admin_email,
            "full_name": req.admin_name,
            "status": "active",
            "academy_id": new_academy_id
        }
        await supabase._post("/rest/v1/admins", admin_data)

        return {
            "success": True, 
            "academy": academy_row, 
            "admin_user_id": admin_user_id,
            "message": "Academy and admin user provisioned successfully."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Academy created, but failed to provision admin user: {str(e)}"
        )

@router.patch("/academies/{academy_id}")
async def update_academy(academy_id: str, data: AcademyStatusUpdate):
    """Update academy status (activate/suspend)."""
    import httpx
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json={"status": data.status},
            headers=supabase.admin_headers
        )
        res.raise_for_status()
        return res.json()

@router.get("/stats")
async def get_saas_stats():
    """Get global SaaS platform stats with real data."""
    import asyncio
    tasks = [
        supabase.client.get(f"{supabase.url}/rest/v1/academies?select=id,status"),
        supabase.client.get(f"{supabase.url}/rest/v1/users?select=id"),
        supabase.client.get(f"{supabase.url}/rest/v1/payments?select=amount"),
        supabase.client.get(f"{supabase.url}/rest/v1/players?select=id"),
    ]
    responses = await asyncio.gather(*tasks)
    
    academies_data = responses[0].json() if responses[0].status_code == 200 else []
    total_academies = len(academies_data)
    active_academies = len([a for a in academies_data if a.get("status") != "suspended"])
    
    total_users = len(responses[1].json()) if responses[1].status_code == 200 else 0
    
    payments = responses[2].json() if responses[2].status_code == 200 else []
    total_mrr = sum(p.get("amount", 0) for p in payments)
    
    total_players = len(responses[3].json()) if responses[3].status_code == 200 else 0
    
    return {
        "total_academies": total_academies,
        "active_academies": active_academies,
        "total_users": total_users,
        "total_mrr": total_mrr,
        "total_players": total_players
    }

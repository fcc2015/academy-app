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

@router.get("/academies")
async def get_academies():
    """Get all academies for SaaS management."""
    # We bypass academy_id filtering because super_admin has None academy_id
    res = await supabase._get("/rest/v1/academies?select=*")
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
    
    # Bypass academy_id filtering because super_admin has None academy_id
    res_academy = await supabase._post("/rest/v1/academies?select=id", academy_data)
    academy_row = res_academy[0]
    new_academy_id = academy_row["id"]

    try:
        # 2. Provision the Admin User via Auth API (bypasses email validation)
        auth_res = await supabase.admin_create_user(
            email=req.admin_email,
            password=req.admin_password,
            role="admin",
            full_name=req.admin_name,
            academy_id=new_academy_id
        )
        
        admin_user_id = auth_res.get("id")
        
        # 3. Explicitly create the public.admins record using direct HTTP call 
        # (InjectClient ignores injection when academy_id is already in JSON)
        admin_data = {
            "user_id": admin_user_id,
            "email": req.admin_email,
            "full_name": req.admin_name,
            "status": "active",
            "academy_id": new_academy_id
        }
        await supabase.client.post(f"{supabase.url}/rest/v1/admins", json=admin_data)

        return {
            "success": True, 
            "academy": academy_row, 
            "admin_user_id": admin_user_id,
            "message": "Academy and admin user provisioned successfully."
        }
    except Exception as e:
        # If user creation fails, we might want to flag the academy as inactive or log it
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Academy created, but failed to provision admin user: {str(e)}"
        )

@router.patch("/academies/{academy_id}")
async def update_academy(academy_id: str, data: dict):
    """Update academy status or billing details."""
    res = await supabase.client.patch(f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}", json=data)
    res.raise_for_status()
    return res.json()

@router.get("/stats")
async def get_saas_stats():
    """Get global SaaS platform stats."""
    import asyncio
    tasks = [
        supabase.client.get(f"{supabase.url}/rest/v1/academies?select=id"),
        supabase.client.get(f"{supabase.url}/rest/v1/users?select=id"),
        supabase.client.get(f"{supabase.url}/rest/v1/payments?select=amount")
    ]
    responses = await asyncio.gather(*tasks)
    
    academies = len(responses[0].json()) if responses[0].status_code == 200 else 0
    users = len(responses[1].json()) if responses[1].status_code == 200 else 0
    payments = responses[2].json() if responses[2].status_code == 200 else []
    total_mrr = sum(p.get("amount", 0) for p in payments)
    
    return {
        "total_academies": academies,
        "total_users": users,
        "total_mrr": total_mrr
    }

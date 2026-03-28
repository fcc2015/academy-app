from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import require_role
from services.supabase_client import supabase

router = APIRouter(
    prefix="/saas",
    tags=["SaaS Admin"],
    dependencies=[Depends(require_role("super_admin"))]
)

@router.get("/academies")
async def get_academies():
    """Get all academies for SaaS management."""
    # We bypass academy_id filtering because super_admin has None academy_id
    res = await supabase.client.get("/rest/v1/academies?select=*")
    res.raise_for_status()
    return res.json()

@router.post("/academies")
async def create_academy(data: dict):
    """Create a new client academy."""
    res = await supabase.client.post("/rest/v1/academies", json=data)
    res.raise_for_status()
    return res.json()

@router.patch("/academies/{academy_id}")
async def update_academy(academy_id: str, data: dict):
    """Update academy status or billing details."""
    res = await supabase.client.patch(f"/rest/v1/academies?id=eq.{academy_id}", json=data)
    res.raise_for_status()
    return res.json()

@router.get("/stats")
async def get_saas_stats():
    """Get global SaaS platform stats."""
    import asyncio
    tasks = [
        supabase.client.get("/rest/v1/academies?select=id"),
        supabase.client.get("/rest/v1/users?select=id"),
        supabase.client.get("/rest/v1/payments?select=amount")
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

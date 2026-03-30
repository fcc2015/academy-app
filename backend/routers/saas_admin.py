from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from core.auth_middleware import require_role
from services.supabase_client import supabase

router = APIRouter(
    prefix="/saas",
    tags=["SaaS Admin"],
    dependencies=[Depends(require_role("super_admin"))]
)

# ── Schemas ──

class AcademyProvisionRequest(BaseModel):
    name: str
    custom_domain: str | None = None
    admin_email: EmailStr
    admin_password: str
    admin_name: str

class AcademyStatusUpdate(BaseModel):
    status: str  # "active" or "suspended"

class DomainAssignment(BaseModel):
    custom_domain: str

class PlanAssignment(BaseModel):
    plan_id: str

# ── Academy CRUD ──

@router.get("/academies")
async def get_academies():
    """Get all academies for SaaS management."""
    res = await supabase._get("/rest/v1/academies?select=*&order=created_at.desc")
    return res

@router.post("/academies")
async def create_academy(req: AcademyProvisionRequest):
    """Provision a new client academy and its root admin."""
    # 1. Create the Academy record
    academy_data = {
        "name": req.name,
        "custom_domain": req.custom_domain,
        "domain_status": "pending" if req.custom_domain else None,
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
        
        # 3. Create the public.users record
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

# ── Domain Management ──

@router.patch("/academies/{academy_id}/domain")
async def assign_domain(academy_id: str, data: DomainAssignment):
    """Assign a custom domain to an academy."""
    import httpx
    # Validate domain format
    domain = data.custom_domain.strip().lower()
    if not domain or '.' not in domain:
        raise HTTPException(status_code=400, detail="Invalid domain format.")
    
    # Check if domain is already used by another academy
    existing = await supabase._get(f"/rest/v1/academies?custom_domain=eq.{domain}&select=id")
    if existing:
        existing_id = existing[0].get("id", "")
        if str(existing_id) != str(academy_id):
            raise HTTPException(status_code=409, detail="This domain is already assigned to another academy.")

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json={"custom_domain": domain, "domain_status": "pending"},
            headers=supabase.admin_headers
        )
        res.raise_for_status()
        return res.json()

@router.delete("/academies/{academy_id}/domain")
async def remove_domain(academy_id: str):
    """Remove a custom domain from an academy."""
    import httpx
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json={"custom_domain": None, "domain_status": None},
            headers=supabase.admin_headers
        )
        res.raise_for_status()
        return {"success": True, "message": "Domain removed."}

@router.post("/academies/{academy_id}/domain/verify")
async def verify_domain(academy_id: str):
    """Verify DNS configuration for a custom domain."""
    import httpx, socket
    # Get the academy's custom domain
    academies = await supabase._get(f"/rest/v1/academies?id=eq.{academy_id}&select=custom_domain")
    if not academies or not academies[0].get("custom_domain"):
        raise HTTPException(status_code=404, detail="No domain configured for this academy.")
    
    domain = academies[0]["custom_domain"]
    resolved_ip = None
    cname_target = None
    domain_status = "pending"
    
    # Step 1: Check CNAME record
    try:
        import subprocess
        result = subprocess.run(
            ["nslookup", "-type=CNAME", domain],
            capture_output=True, text=True, timeout=10
        )
        output = result.stdout.lower()
        if "netlify" in output:
            cname_target = "netlify"
            domain_status = "verified"
    except Exception:
        pass
    
    # Step 2: Fallback — check A record resolution
    if domain_status != "verified":
        try:
            resolved_ip = socket.gethostbyname(domain)
            # Domain resolves — mark as verified
            domain_status = "verified"
        except socket.gaierror:
            domain_status = "pending"
    
    # Update status in DB
    async with httpx.AsyncClient(timeout=30.0) as client:
        await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json={"domain_status": domain_status},
            headers=supabase.admin_headers
        )
    
    return {
        "domain": domain,
        "status": domain_status,
        "resolved_ip": resolved_ip,
        "cname_target": cname_target
    }

# ── Platform Stats ──

@router.get("/stats")
async def get_saas_stats():
    """Get global SaaS platform stats with real data (uses service_role for cross-tenant access)."""
    import asyncio, httpx
    try:
        async with httpx.AsyncClient(timeout=30.0, headers=supabase.admin_headers) as client:
            tasks = [
                client.get(f"{supabase.url}/rest/v1/academies?select=id,status,custom_domain,domain_status"),
                client.get(f"{supabase.url}/rest/v1/users?select=id"),
                client.get(f"{supabase.url}/rest/v1/payments?select=amount"),
                client.get(f"{supabase.url}/rest/v1/players?select=id"),
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        academies_data = []
        if not isinstance(responses[0], Exception) and responses[0].status_code == 200:
            academies_data = responses[0].json()
        total_academies = len(academies_data)
        active_academies = len([a for a in academies_data if a.get("status") != "suspended"])
        domains_configured = len([a for a in academies_data if a.get("custom_domain")])
        domains_verified = len([a for a in academies_data if a.get("domain_status") == "verified"])
        
        total_users = 0
        if not isinstance(responses[1], Exception) and responses[1].status_code == 200:
            total_users = len(responses[1].json())
        
        total_mrr = 0
        if not isinstance(responses[2], Exception) and responses[2].status_code == 200:
            payments = responses[2].json()
            total_mrr = sum(p.get("amount", 0) for p in payments)
        
        total_players = 0
        if not isinstance(responses[3], Exception) and responses[3].status_code == 200:
            total_players = len(responses[3].json())
        
        return {
            "total_academies": total_academies,
            "active_academies": active_academies,
            "total_users": total_users,
            "total_mrr": total_mrr,
            "total_players": total_players,
            "domains_configured": domains_configured,
            "domains_verified": domains_verified
        }
    except Exception:
        return {
            "total_academies": 0,
            "active_academies": 0,
            "total_users": 0,
            "total_mrr": 0,
            "total_players": 0,
            "domains_configured": 0,
            "domains_verified": 0
        }

# ── Plan Assignment ──

@router.patch("/academies/{academy_id}/plan")
async def assign_plan(academy_id: str, data: PlanAssignment):
    """Assign a subscription plan to an academy."""
    import httpx
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json={"plan_id": data.plan_id, "subscription_status": "active"},
            headers=supabase.admin_headers
        )
        res.raise_for_status()
        return res.json()

# ── SaaS Settings ──

DEFAULT_SETTINGS = {
    "platform_name": "Academy SaaS Platform",
    "support_email": "support@academy.com",
    "default_trial_days": 14,
    "max_players_starter": 50,
    "max_players_pro": 200,
    "max_coaches_starter": 2,
    "max_coaches_pro": 10,
    "auto_provision": True,
    "email_notifications": True,
    "auto_backup": True,
    "maintenance_mode": False,
    "paypal_sandbox": True,
}

@router.get("/settings")
async def get_saas_settings():
    """Get SaaS platform settings."""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(
                f"{supabase.url}/rest/v1/saas_settings?select=*&limit=1",
                headers=supabase.admin_headers
            )
            if res.status_code == 200:
                data = res.json()
                if data:
                    # First row is the settings
                    row = data[0]
                    # Remove DB metadata fields
                    row.pop("id", None)
                    row.pop("created_at", None)
                    row.pop("updated_at", None)
                    return row
        return DEFAULT_SETTINGS
    except Exception:
        return DEFAULT_SETTINGS

@router.put("/settings")
async def update_saas_settings(request: dict):
    """Update SaaS platform settings (upsert)."""
    import httpx
    try:
        # Check if settings row exists
        async with httpx.AsyncClient(timeout=30.0) as client:
            check = await client.get(
                f"{supabase.url}/rest/v1/saas_settings?select=id&limit=1",
                headers=supabase.admin_headers
            )
            existing = check.json() if check.status_code == 200 else []

            if existing:
                # Update
                settings_id = existing[0]["id"]
                res = await client.patch(
                    f"{supabase.url}/rest/v1/saas_settings?id=eq.{settings_id}",
                    json=request,
                    headers=supabase.admin_headers
                )
                res.raise_for_status()
                return {"success": True, "action": "updated"}
            else:
                # Insert
                res = await client.post(
                    f"{supabase.url}/rest/v1/saas_settings",
                    json=request,
                    headers=supabase.admin_headers
                )
                res.raise_for_status()
                return {"success": True, "action": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")

import logging
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
import re
from services.supabase_client import supabase
from core.auth_middleware import require_role

logger = logging.getLogger("public_api")
from urllib.parse import quote
import httpx

router = APIRouter(prefix="/public", tags=["Public"])


class SetupAcademyRequest(BaseModel):
    academy_name: str = Field(..., min_length=2, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)

@router.post("/setup-academy")
async def setup_academy_for_google_user(req: SetupAcademyRequest, user: dict = Depends(require_role("player", "parent", "admin", "coach", "super_admin"))):
    """
    Called after Google OAuth — creates academy and adds the authenticated user as admin.
    The user already exists in Supabase Auth, we just need to create the academy + admin record.
    """
    from core.auth_middleware import verify_token
    user_id = user.get("user_id")
    user_email = user.get("email")

    academy_name = req.academy_name
    if req.city:
        academy_name = f"{req.academy_name} — {req.city}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Create academy
        res = await client.post(
            f"{supabase.url}/rest/v1/academies?select=id",
            json={"name": academy_name, "status": "active", "subscription_status": "free"},
            headers=supabase.admin_headers
        )
        if res.status_code not in [200, 201]:
            raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")
        academy_row = res.json()
        if isinstance(academy_row, list):
            academy_row = academy_row[0]
        new_academy_id = academy_row["id"]

        # 2. Create/update users record
        await client.post(
            f"{supabase.url}/rest/v1/users",
            json={"id": user_id, "full_name": user_email, "role": "admin", "academy_id": new_academy_id},
            headers={**supabase.admin_headers, "Prefer": "resolution=merge-duplicates,return=minimal"}
        )

        # 3. Add to admins table
        await client.post(
            f"{supabase.url}/rest/v1/admins",
            json={"user_id": user_id, "email": user_email, "full_name": user_email, "status": "active", "academy_id": new_academy_id},
            headers={**supabase.admin_headers, "Prefer": "resolution=merge-duplicates,return=minimal"}
        )

    return {"success": True, "academy_id": new_academy_id}


# ── Self-Service Academy Registration (Free Plan) ──

class RegisterAcademyRequest(BaseModel):
    academy_name: str = Field(..., min_length=2, max_length=100)
    admin_name: str = Field(..., min_length=2, max_length=100)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=6, max_length=128)

    @field_validator("academy_name", "admin_name")
    @classmethod
    def strip_html(cls, v: str) -> str:
        return re.sub(r"<[^>]+>", "", v).strip()


@router.post("/register-academy")
async def register_academy(req: RegisterAcademyRequest):
    """
    Public endpoint: Create a free academy and provision its admin user.
    No authentication required — this is the self-service signup flow.
    """
    # Validate password length
    if len(req.admin_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 6 caractères."
        )

    # --- Duplicate Check: Academy Name ---
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            check_name = await client.get(
                f"{supabase.url}/rest/v1/academies?name=eq.{quote(req.academy_name)}&select=id",
                headers=supabase.admin_headers
            )
            if check_name.status_code == 200 and check_name.json():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Une académie avec ce nom existe déjà."
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Academy name duplicate check failed (non-critical): %s", e)

    # --- Duplicate Check: Admin Email ---
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            check_email = await client.get(
                f"{supabase.url}/rest/v1/admins?email=eq.{quote(str(req.admin_email))}&select=id",
                headers=supabase.admin_headers
            )
            if check_email.status_code == 200 and check_email.json():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cet email est déjà utilisé."
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Admin email duplicate check failed (non-critical): %s", e)

    # 1. Create the Academy record with free plan
    subdomain = re.sub(r'[^a-z0-9-]', '', req.academy_name.lower().replace(' ', '-')).strip('-')
    if not subdomain:
        subdomain = f"academy-{int(__import__('time').time())}"
    academy_data = {
        "name": req.academy_name,
        "subdomain": subdomain,
        "status": "active",
        "subscription_status": "free",
    }

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            res = await client.post(
                f"{supabase.url}/rest/v1/academies?select=id",
                json=academy_data,
                headers=supabase.admin_headers
            )
            if res.status_code not in [200, 201]:
                raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")
            academy_row = res.json()
            if isinstance(academy_row, list):
                academy_row = academy_row[0]
            new_academy_id = academy_row["id"]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erreur création académie: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

    # 2. Provision the Admin User via Supabase Auth Admin API
    try:
        auth_res = await supabase.admin_create_user(
            email=req.admin_email,
            password=req.admin_password,
            role="admin",
            full_name=req.admin_name,
            academy_id=new_academy_id
        )
        admin_user_id = auth_res.get("id")
    except Exception as e:
        # Rollback: delete the academy if user creation fails
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                await client.delete(
                    f"{supabase.url}/rest/v1/academies?id=eq.{new_academy_id}",
                    headers=supabase.admin_headers
                )
        except Exception as rollback_err:
            logger.warning("Academy rollback failed: %s", rollback_err)
        error_msg = str(e)
        logger.error("Admin user creation failed: %s", e, exc_info=True)
        if "already been registered" in error_msg.lower() or "duplicate" in error_msg.lower():
            raise HTTPException(status_code=409, detail="Cet email est déjà enregistré.")
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

    # 3. Create public.users record
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            await client.post(
                f"{supabase.url}/rest/v1/users",
                json={
                    "id": admin_user_id,
                    "full_name": req.admin_name,
                    "role": "admin",
                    "academy_id": new_academy_id
                },
                headers=supabase.admin_headers
            )
    except Exception as e:
        logger.warning(f"[register-academy] Users record (non-critical): {e}")

    # 4. Create public.admins record
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            await client.post(
                f"{supabase.url}/rest/v1/admins",
                json={
                    "user_id": admin_user_id,
                    "email": req.admin_email,
                    "full_name": req.admin_name,
                    "status": "active",
                    "academy_id": new_academy_id
                },
                headers=supabase.admin_headers
            )
    except Exception as e:
        logger.warning(f"[register-academy] Admins record (non-critical): {e}")

    # 5. Create default academy_settings
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            await client.post(
                f"{supabase.url}/rest/v1/academy_settings",
                json={
                    "academy_id": new_academy_id,
                    "academy_name": req.academy_name,
                    "language": "fr",
                    "currency": "MAD"
                },
                headers=supabase.admin_headers
            )
    except Exception as e:
        logger.warning(f"[register-academy] Settings record (non-critical): {e}")

    return {
        "success": True,
        "academy_id": new_academy_id,
        "admin_email": req.admin_email,
        "message": "Académie créée avec succès ! Connectez-vous avec vos identifiants."
    }

class PublicRequest(BaseModel):
    type: str = Field(..., pattern=r"^(contact|registration)$")
    name: str = Field(..., min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    player_name: Optional[str] = Field(None, max_length=100)
    birth_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    address: Optional[str] = Field(None, max_length=300)
    plan_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    message: Optional[str] = Field(None, max_length=2000)

    @field_validator("name", "player_name", "address", "message")
    @classmethod
    def strip_html(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return re.sub(r"<[^>]+>", "", v).strip()
        return v

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
            logger.warning(f"Failed to insert notification from public API: {e}")
            if err_details:
                logger.warning(f"Notification error details: {err_details.text}")
            pass # ignore notification failure
            
        return {"success": True, "message": "Request received successfully."}
    except Exception as e:
        logger.error("Error saving request: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.get("/admin/requests", dependencies=[Depends(require_role("admin", "super_admin", "staff"))])
async def fetch_public_requests(request_status: str = "active"):
    try:
        data = await supabase.get_public_requests(status=request_status)
        return data
    except Exception as e:
        logger.error("Error fetching requests: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

class RequestUpdate(BaseModel):
    status: str

@router.patch("/admin/requests/{request_id}", dependencies=[Depends(require_role("admin", "super_admin"))])
async def update_request_status(request_id: str, update: RequestUpdate):
    try:
        data = await supabase.update_public_request_status(request_id, update.status)
        return data
    except Exception as e:
        logger.error("Error updating request: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.delete("/admin/requests/{request_id}", dependencies=[Depends(require_role("admin", "super_admin"))])
async def delete_public_request(request_id: str):
    try:
        data = await supabase.delete_public_request(request_id)
        return data
    except Exception as e:
        logger.error("Error deleting request: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

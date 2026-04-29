"""
الفروع — إدارة فروع الأكاديمية
Branches CRUD router for multi-branch academy support.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import httpx
from core.auth_middleware import require_role
from core.context import academy_id_ctx
from core.config import settings as app_settings
from services.supabase_client import supabase
from schemas.branches import BranchCreate, BranchUpdate, BranchResponse, SousAdminBranchAssign

logger = logging.getLogger("branches")


async def _require_enterprise_plan():
    """ميزة الفروع متاحة فقط فـ Enterprise plan."""
    academy_id = academy_id_ctx.get(None)
    if not academy_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="لم يتم تحديد الأكاديمية",
        )
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            f"{app_settings.SUPABASE_URL}/rest/v1/academies?id=eq.{academy_id}&select=plan_id",
            headers=supabase.admin_headers,
        )
    if res.status_code != 200 or not res.json():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="تعذر التحقق من خطة الأكاديمية",
        )
    plan = (res.json()[0].get("plan_id") or "free").lower()
    if plan != "enterprise":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="ميزة الفروع متاحة فقط في خطة Enterprise. يرجى الترقية للاستفادة منها.",
        )


router = APIRouter(
    prefix="/branches",
    tags=["Branches"],
    dependencies=[
        Depends(require_role("admin", "sous_admin", "super_admin")),
        Depends(_require_enterprise_plan),
    ],
)


@router.get("/", response_model=list[BranchResponse])
async def list_branches(user: dict = Depends(require_role("admin", "sous_admin", "coach", "super_admin"))):
    """قائمة الفروع — Admin يشوف كلشي، Sous-admin يشوف غير فروعه"""
    academy_id = academy_id_ctx.get(None)
    if not academy_id:
        raise HTTPException(status_code=400, detail="لم يتم تحديد الأكاديمية")

    async with httpx.AsyncClient(timeout=15.0) as client:
        # If sous_admin, only return their assigned branches
        if user["role"] == "sous_admin":
            # Get assigned branch IDs
            sa_res = await client.get(
                f"{supabase.url}/rest/v1/sous_admin_branches"
                f"?user_id=eq.{user['user_id']}&academy_id=eq.{academy_id}&select=branch_id",
                headers=supabase.admin_headers,
            )
            if sa_res.status_code >= 400:
                return []
            branch_ids = [r["branch_id"] for r in sa_res.json()]
            if not branch_ids:
                return []
            ids_filter = ",".join(branch_ids)
            res = await client.get(
                f"{supabase.url}/rest/v1/branches"
                f"?academy_id=eq.{academy_id}&id=in.({ids_filter})&order=created_at.asc",
                headers=supabase.admin_headers,
            )
        else:
            res = await client.get(
                f"{supabase.url}/rest/v1/branches"
                f"?academy_id=eq.{academy_id}&order=created_at.asc",
                headers=supabase.admin_headers,
            )

        if res.status_code >= 400:
            logger.error("Failed to fetch branches: %s", res.text)
            return []
        return res.json()


@router.post("/", response_model=BranchResponse, status_code=201)
async def create_branch(
    branch: BranchCreate,
    user: dict = Depends(require_role("admin", "super_admin"))
):
    """إنشاء فرع جديد — Admin فقط"""
    academy_id = academy_id_ctx.get(None)
    if not academy_id:
        raise HTTPException(status_code=400, detail="لم يتم تحديد الأكاديمية")

    payload = {
        "academy_id": academy_id,
        **branch.model_dump(),
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(
            f"{supabase.url}/rest/v1/branches",
            json=payload,
            headers={**supabase.admin_headers, "Prefer": "return=representation"},
        )
        if res.status_code >= 400:
            logger.error("Create branch failed: %s", res.text)
            raise HTTPException(status_code=500, detail="فشل إنشاء الفرع")
        rows = res.json()
        return rows[0] if isinstance(rows, list) else rows


@router.put("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: str,
    branch: BranchUpdate,
    user: dict = Depends(require_role("admin", "super_admin"))
):
    """تعديل فرع — Admin فقط"""
    update_data = branch.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.patch(
            f"{supabase.url}/rest/v1/branches?id=eq.{branch_id}",
            json=update_data,
            headers={**supabase.admin_headers, "Prefer": "return=representation"},
        )
        if res.status_code >= 400:
            logger.error("Update branch failed: %s", res.text)
            raise HTTPException(status_code=500, detail="فشل تحديث الفرع")
        rows = res.json()
        if not rows:
            raise HTTPException(status_code=404, detail="الفرع غير موجود")
        return rows[0]


@router.delete("/{branch_id}", status_code=204)
async def delete_branch(
    branch_id: str,
    user: dict = Depends(require_role("admin", "super_admin"))
):
    """حذف فرع — Admin فقط"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.delete(
            f"{supabase.url}/rest/v1/branches?id=eq.{branch_id}",
            headers=supabase.admin_headers,
        )
        if res.status_code >= 400:
            logger.error("Delete branch failed: %s", res.text)
            raise HTTPException(status_code=500, detail="فشل حذف الفرع")


# ── Sous-Admin Assignment ──

@router.post("/assign-sous-admin")
async def assign_sous_admin_to_branch(
    data: SousAdminBranchAssign,
    user: dict = Depends(require_role("admin", "super_admin"))
):
    """تعيين Sous-Admin لفرع معين"""
    academy_id = academy_id_ctx.get(None)
    if not academy_id:
        raise HTTPException(status_code=400, detail="لم يتم تحديد الأكاديمية")

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(
            f"{supabase.url}/rest/v1/sous_admin_branches",
            json={
                "user_id": data.user_id,
                "branch_id": data.branch_id,
                "academy_id": academy_id,
            },
            headers={**supabase.admin_headers, "Prefer": "return=representation"},
        )
        if res.status_code == 409 or (res.status_code >= 400 and "duplicate" in res.text.lower()):
            raise HTTPException(status_code=409, detail="هذا المسؤول معين مسبقاً لهذا الفرع")
        if res.status_code >= 400:
            logger.error("Assign sous-admin failed: %s", res.text)
            raise HTTPException(status_code=500, detail="فشل تعيين المسؤول")
        return {"success": True, "message": "تم تعيين المسؤول بنجاح"}


@router.delete("/unassign-sous-admin/{user_id}/{branch_id}")
async def unassign_sous_admin(
    user_id: str,
    branch_id: str,
    user: dict = Depends(require_role("admin", "super_admin"))
):
    """إلغاء تعيين Sous-Admin من فرع"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.delete(
            f"{supabase.url}/rest/v1/sous_admin_branches"
            f"?user_id=eq.{user_id}&branch_id=eq.{branch_id}",
            headers=supabase.admin_headers,
        )
        if res.status_code >= 400:
            raise HTTPException(status_code=500, detail="فشل إلغاء التعيين")
        return {"success": True, "message": "تم إلغاء التعيين"}


@router.get("/sous-admins/{branch_id}")
async def get_branch_sous_admins(
    branch_id: str,
    user: dict = Depends(require_role("admin", "super_admin"))
):
    """قائمة Sous-Admins المعينين لفرع"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(
            f"{supabase.url}/rest/v1/sous_admin_branches"
            f"?branch_id=eq.{branch_id}&select=user_id,users(id,full_name,email)",
            headers=supabase.admin_headers,
        )
        if res.status_code >= 400:
            return []
        return res.json()

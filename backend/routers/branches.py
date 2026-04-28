import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from core.auth_middleware import verify_token, require_role
from core.context import user_id_ctx, role_ctx, academy_id_ctx
from core.config import settings
import httpx
from schemas.branches import (
    BranchCreate,
    BranchUpdate,
    BranchResponse,
    SousAdminBranchAssign,
)
from services.supabase_client import supabase

logger = logging.getLogger("branches")


async def _require_enterprise_plan():
    """Ensures the current academy is on the enterprise plan; raises 403 otherwise."""
    academy_id = academy_id_ctx.get(None)
    if not academy_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="لم يتم تحديد الأكاديمية",
        )
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            f"{settings.SUPABASE_URL}/rest/v1/academies?id=eq.{academy_id}&select=plan_id",
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


async def _get_sous_admin_branch_ids(user_id: str) -> List[str]:
    """Return the list of branch_ids assigned to a sous_admin user."""
    rows = await supabase._get(
        f"/rest/v1/sous_admin_branches?user_id=eq.{user_id}&select=branch_id"
    )
    return [r["branch_id"] for r in (rows or [])]


router = APIRouter(
    prefix="/branches",
    tags=["Branches"],
    dependencies=[Depends(verify_token), Depends(_require_enterprise_plan)],
)


@router.get("/", response_model=List[BranchResponse])
async def list_branches():
    """
    List branches scoped to the current academy.
    - admin / super_admin: all branches in the academy
    - sous_admin: only branches assigned to them
    - others: forbidden
    """
    role = role_ctx.get(None)
    user_id = user_id_ctx.get(None)

    if role not in ("admin", "super_admin", "sous_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية للوصول إلى الفروع",
        )

    try:
        if role == "sous_admin":
            branch_ids = await _get_sous_admin_branch_ids(user_id)
            if not branch_ids:
                return []
            ids_csv = ",".join(branch_ids)
            return await supabase._get(
                f"/rest/v1/branches?id=in.({ids_csv})&select=*&order=created_at.desc"
            )
        return await supabase._get(
            "/rest/v1/branches?select=*&order=created_at.desc"
        )
    except Exception as e:
        logger.error("Error fetching branches: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="فشل في جلب قائمة الفروع",
        )


@router.post(
    "/",
    response_model=BranchResponse,
    dependencies=[Depends(require_role("admin", "super_admin"))],
)
async def create_branch(branch: BranchCreate):
    try:
        data = branch.model_dump()
        response = await supabase._post("/rest/v1/branches", data)
        if not response:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="فشل في إنشاء الفرع",
            )
        return response[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating branch: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="فشل في إنشاء الفرع",
        )


@router.put(
    "/{branch_id}",
    response_model=BranchResponse,
    dependencies=[Depends(require_role("admin", "super_admin"))],
)
async def update_branch(branch_id: str, branch: BranchUpdate):
    try:
        data = branch.model_dump(exclude_none=True)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="لا توجد بيانات للتحديث",
            )
        res = await supabase.client.patch(
            f"/rest/v1/branches?id=eq.{branch_id}", json=data
        )
        res.raise_for_status()
        rows = res.json()
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="الفرع غير موجود",
            )
        return rows[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating branch: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="فشل في تحديث الفرع",
        )


@router.delete(
    "/{branch_id}",
    dependencies=[Depends(require_role("admin", "super_admin"))],
)
async def delete_branch(branch_id: str):
    try:
        res = await supabase.client.delete(
            f"/rest/v1/branches?id=eq.{branch_id}"
        )
        res.raise_for_status()
        return {"message": "تم حذف الفرع بنجاح"}
    except Exception as e:
        logger.error("Error deleting branch: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="فشل في حذف الفرع",
        )


# ---------- Sous-admin branch assignments ----------

@router.get(
    "/{branch_id}/sous-admins",
    dependencies=[Depends(require_role("admin", "super_admin"))],
)
async def list_branch_sous_admins(branch_id: str):
    try:
        rows = await supabase._get(
            f"/rest/v1/sous_admin_branches?branch_id=eq.{branch_id}"
            "&select=id,user_id,branch_id,users(id,full_name,email)"
        )
        return rows or []
    except Exception as e:
        logger.error("Error listing sous-admins: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="فشل في جلب المسؤولين المساعدين",
        )


@router.post(
    "/assign-sous-admin",
    dependencies=[Depends(require_role("admin", "super_admin"))],
)
async def assign_sous_admin(payload: SousAdminBranchAssign):
    """Assign a sous_admin user to a branch within the current academy."""
    try:
        existing = await supabase._get(
            f"/rest/v1/sous_admin_branches"
            f"?user_id=eq.{payload.user_id}"
            f"&branch_id=eq.{payload.branch_id}&select=id"
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="هذا المستخدم معين بالفعل لهذا الفرع",
            )

        data = {
            "user_id": payload.user_id,
            "branch_id": payload.branch_id,
        }
        response = await supabase._post("/rest/v1/sous_admin_branches", data)
        return response[0] if response else {}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error assigning sous-admin: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="فشل في تعيين المسؤول المساعد",
        )


@router.delete(
    "/assign-sous-admin/{assignment_id}",
    dependencies=[Depends(require_role("admin", "super_admin"))],
)
async def unassign_sous_admin(assignment_id: str):
    try:
        res = await supabase.client.delete(
            f"/rest/v1/sous_admin_branches?id=eq.{assignment_id}"
        )
        res.raise_for_status()
        return {"message": "تم إلغاء التعيين بنجاح"}
    except Exception as e:
        logger.error("Error unassigning sous-admin: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="فشل في إلغاء التعيين",
        )

from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token, require_role
from core.context import academy_id_ctx, role_ctx
from typing import List
from schemas.advertisements import AdCreate, AdResponse
from services.supabase_client import supabase
import logging

logger = logging.getLogger("advertisements")

router = APIRouter(prefix="/advertisements", tags=["Advertisements"], dependencies=[Depends(verify_token)])


@router.get("/", response_model=List[AdResponse])
async def get_active_ads(user: dict = Depends(verify_token)):
    """Get active ads targeted at the current user's role and category (or all if super_admin)."""
    try:
        role = role_ctx.get(None)
        if role == "super_admin":
            data = await supabase.get_advertisements(role=role, active_only=False)
        else:
            data = await supabase.get_advertisements(role=role, active_only=True)
        return data
    except Exception as e:
        logger.error("Error fetching advertisements: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )


@router.post("/", response_model=AdResponse)
async def create_ad(
    ad: AdCreate,
    user: dict = Depends(require_role("admin", "super_admin"))
):
    """Create a new advertisement (admin only)."""
    try:
        ad_dict = ad.model_dump(exclude_unset=True)
        result = await supabase.insert_advertisement(ad_dict)
        if isinstance(result, list):
            return result[0]
        return result
    except Exception as e:
        logger.error("Error creating advertisement: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )


@router.patch("/{ad_id}", response_model=AdResponse)
async def update_ad(
    ad_id: str,
    ad: AdCreate,
    user: dict = Depends(require_role("admin", "super_admin"))
):
    """Update an advertisement."""
    try:
        ad_dict = ad.model_dump(exclude_unset=True)
        result = await supabase.update_advertisement(ad_id, ad_dict)
        if isinstance(result, list):
            return result[0]
        return result
    except Exception as e:
        logger.error("Error updating advertisement: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )


@router.delete("/{ad_id}")
async def delete_ad(
    ad_id: str,
    user: dict = Depends(require_role("admin", "super_admin"))
):
    """Delete an advertisement."""
    try:
        return await supabase.delete_advertisement(ad_id)
    except Exception as e:
        logger.error("Error deleting advertisement: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )


@router.post("/{ad_id}/view")
async def track_view(ad_id: str):
    """Increment view count for an ad."""
    try:
        return await supabase.increment_ad_stat(ad_id, "views_count")
    except Exception as e:
        logger.error("Error tracking view: %s", e, exc_info=True)
        # Non-critical — return 200 anyway
        return {"success": False}


@router.post("/{ad_id}/click")
async def track_click(ad_id: str):
    """Increment click count for an ad."""
    try:
        return await supabase.increment_ad_stat(ad_id, "clicks_count")
    except Exception as e:
        logger.error("Error tracking click: %s", e, exc_info=True)
        return {"success": False}

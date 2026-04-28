import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from core.context import academy_id_ctx
from core.config import settings as app_settings
from schemas.settings import AcademySettingsUpdate, AcademySettingsResponse
from services.supabase_client import supabase

logger = logging.getLogger("settings")

router = APIRouter(prefix="/settings", tags=["Settings"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=AcademySettingsResponse)
async def get_settings():
    try:
        response = await supabase.get_academy_settings()
        if response:
            return response

        # Auto-seed for academies provisioned before settings-row-on-create was added
        academy_id = academy_id_ctx.get(None)
        if not academy_id:
            raise HTTPException(status_code=404, detail="Settings not found")

        async with httpx.AsyncClient(timeout=10.0) as client:
            acc = await client.get(
                f"{app_settings.SUPABASE_URL}/rest/v1/academies?id=eq.{academy_id}&select=name",
                headers=supabase.admin_headers,
            )
            academy_name = (acc.json()[0].get("name") if acc.status_code == 200 and acc.json() else "Academy")
            seed = await client.post(
                f"{app_settings.SUPABASE_URL}/rest/v1/academy_settings",
                json={"academy_id": academy_id, "academy_name": academy_name},
                headers={**supabase.admin_headers, "Prefer": "return=representation"},
            )
            if seed.status_code in (200, 201):
                rows = seed.json()
                return rows[0] if isinstance(rows, list) else rows
        raise HTTPException(status_code=404, detail="Settings not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching settings: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.get("/plan")
async def get_academy_plan():
    """Returns the current academy's plan_id and computed feature flags."""
    academy_id = academy_id_ctx.get(None)
    if not academy_id:
        return {"plan_id": "free", "features": {"branches": False}}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                f"{app_settings.SUPABASE_URL}/rest/v1/academies?id=eq.{academy_id}&select=plan_id",
                headers=supabase.admin_headers,
            )
        plan_id = "free"
        if res.status_code == 200 and res.json():
            plan_id = (res.json()[0].get("plan_id") or "free").lower()
        return {
            "plan_id": plan_id,
            "features": {"branches": plan_id == "enterprise"},
        }
    except Exception as e:
        logger.error("Error fetching plan: %s", e, exc_info=True)
        return {"plan_id": "free", "features": {"branches": False}}


@router.patch("/{settings_id}", response_model=AcademySettingsResponse)
async def update_settings(settings_id: str, settings: AcademySettingsUpdate):
    try:
        settings_dict = settings.model_dump(exclude_unset=True)
        
        # PROACTIVE: Filter out season fields if columns don't exist yet to avoid crash
        # This keeps the save button working for everything else
        try:
            response = await supabase.update_academy_settings(settings_id, settings_dict)
            return response[0]
        except Exception as e:
            # If it fails, try again without the new fields
            new_fields = ["season_start", "season_end"]
            filtered_dict = {k: v for k, v in settings_dict.items() if k not in new_fields}
            logger.warning(f"Settings update failed once, retrying with filtered fields: {e}")
            response = await supabase.update_academy_settings(settings_id, filtered_dict)
            return response[0]
            
    except Exception as e:
        logger.error("Error updating settings: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

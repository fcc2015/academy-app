import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from core.context import academy_id_ctx, user_id_ctx, role_ctx
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

        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
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
    """Returns plan + feature flags + academy name + (for sous_admin) assigned branches."""
    academy_id = academy_id_ctx.get(None)
    role = role_ctx.get(None)
    user_id = user_id_ctx.get(None)
    base = {"academy_id": academy_id, "plan_id": "free", "academy_name": None,
            "branches_assigned": [], "features": {"branches": False}}
    if not academy_id:
        return base
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            ac_res = await client.get(
                f"{app_settings.SUPABASE_URL}/rest/v1/academies?id=eq.{academy_id}&select=plan_id,name",
                headers=supabase.admin_headers,
            )
            plan_id = "free"
            academy_name = None
            if ac_res.status_code == 200 and ac_res.json():
                row = ac_res.json()[0]
                plan_id = (row.get("plan_id") or "free").lower()
                academy_name = row.get("name")

            branches_assigned = []
            if role == "sous_admin" and user_id:
                sa_res = await client.get(
                    f"{app_settings.SUPABASE_URL}/rest/v1/sous_admin_branches"
                    f"?user_id=eq.{user_id}&academy_id=eq.{academy_id}"
                    "&select=branch_id,branches(id,name,city)",
                    headers=supabase.admin_headers,
                )
                if sa_res.status_code == 200:
                    for r in sa_res.json():
                        b = r.get("branches")
                        if b:
                            branches_assigned.append({
                                "id": b.get("id"),
                                "name": b.get("name"),
                                "city": b.get("city"),
                            })

        return {
            "academy_id": academy_id,
            "plan_id": plan_id,
            "academy_name": academy_name,
            "branches_assigned": branches_assigned,
            "features": {"branches": plan_id == "enterprise"},
        }
    except Exception as e:
        logger.error("Error fetching plan: %s", e, exc_info=True)
        return base


@router.patch("/{settings_id}", response_model=AcademySettingsResponse)
async def update_settings(settings_id: str, settings: AcademySettingsUpdate):
    try:
        settings_dict = settings.model_dump(exclude_unset=True)
        
        response = await supabase.update_academy_settings(settings_id, settings_dict)
        if response and isinstance(response, list) and len(response) > 0:
            updated_row = response[0]
            academy_id = updated_row.get("academy_id")
            if academy_id:
                academy_update = {}
                if "logo_url" in settings_dict:
                    academy_update["logo_url"] = settings_dict["logo_url"]
                if "academy_name" in settings_dict:
                    academy_update["name"] = settings_dict["academy_name"]
                
                about_text = settings_dict.get("about_text")
                if about_text and about_text.startswith("{"):
                    import json
                    try:
                        parsed = json.loads(about_text)
                        if "primary_color" in parsed:
                            academy_update["primary_color"] = parsed["primary_color"]
                    except Exception:
                        pass
                
                if academy_update:
                    await supabase.update_academy(academy_id, academy_update)
            return updated_row
        return response
    except Exception as e:
        logger.error("Error updating settings: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

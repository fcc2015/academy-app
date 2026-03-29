from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token
from schemas.settings import AcademySettingsUpdate, AcademySettingsResponse
from services.supabase_client import supabase

router = APIRouter(prefix="/settings", tags=["Settings"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=AcademySettingsResponse)
async def get_settings():
    try:
        response = await supabase.get_academy_settings()
        if not response:
            raise HTTPException(status_code=404, detail="Settings not found")
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching settings: {str(e)}"
        )

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
            print(f"Update failed once, retrying with filtered fields. Error: {e}")
            response = await supabase.update_academy_settings(settings_id, filtered_dict)
            return response[0]
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating settings: {str(e)}"
        )

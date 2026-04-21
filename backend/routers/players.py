import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from core.auth_middleware import verify_token, require_role, assert_parent_owns_player
from core.context import user_id_ctx, role_ctx
from typing import List

logger = logging.getLogger("players")
from schemas.users import PlayerCreate, PlayerResponse, UserBase
from services.supabase_client import supabase
from urllib.parse import quote

router = APIRouter(prefix="/players", tags=["Players Engine"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[PlayerResponse])
async def get_all_players(user: dict = Depends(require_role("admin", "coach", "super_admin"))):
    try:
        raw_players = await supabase.get_players()
        # Players table now stores full_name directly – no join needed
        for p in raw_players:
            if not p.get('full_name'):
                p['full_name'] = p.get('users', {}).get('full_name', 'Unknown') if isinstance(p.get('users'), dict) else 'Unknown'
        return raw_players
    except Exception as e:
        logger.error("Error fetching players: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.post("/", response_model=PlayerResponse, dependencies=[Depends(require_role("admin", "super_admin"))])
async def create_player(player: PlayerCreate):
    try:
        # --- Duplicate Check: Player Name (via users table which has full_name column) ---
        try:
            existing = await supabase._get(
                f"/rest/v1/users?full_name=eq.{quote(player.full_name)}&role=eq.player&select=id"
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A player with this name already exists. | واحد اللاعب بهاد الاسم ديجا كاين: {player.full_name}"
                )
        except HTTPException:
            raise
        except Exception as dup_err:
            logger.warning("Duplicate check failed (non-critical): %s", dup_err)

        # 1. Insert into users table first (required by FK constraint players_user_id_fkey)
        user_data = {
            "id": player.user_id,
            "full_name": player.full_name,
            "role": "player"
        }
        try:
            await supabase.insert_user(user_data)
        except Exception as user_err:
            # If user already exists (duplicate), continue
            if "duplicate" not in str(user_err).lower() and "23505" not in str(user_err):
                raise user_err

        # 2. Insert player record
        player_dict = player.model_dump(exclude={"full_name"}, mode='json')
        response = await supabase.insert_player(player_dict)

        # 3. Notify admins (non-critical)
        try:
            await supabase.insert_notification({
                "title": "New Player Added",
                "message": f"Player {player.full_name} has been successfully added to the system.",
                "type": "admin_alert",
                "target_role": "Admin"
            })
        except Exception as e:
            logger.warning(f"Failed to generate notification: {e}")

        result = response[0]
        result["full_name"] = player.full_name
        return result
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error("Error creating player: %s", e, exc_info=True)
        if "duplicate" in error_msg.lower() or "23505" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This player already exists. | هاد اللاعب ديجا كاين: {player.full_name}"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"[DEBUG] create_player failed: {type(e).__name__}: {error_msg}"
        )


@router.put("/{user_id}", response_model=PlayerResponse, dependencies=[Depends(require_role("admin", "super_admin"))])
async def update_player(user_id: str, player: PlayerCreate):
    try:
        player_dict = player.model_dump(exclude={"user_id", "full_name"}, mode='json')
        response = await supabase.update_player(user_id, player_dict)
        if not response:
            raise HTTPException(status_code=404, detail="Player not found")
            
        result = response[0]
        result["full_name"] = player.full_name
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating player: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.delete("/{user_id}", dependencies=[Depends(require_role("admin", "super_admin"))])
async def delete_player(user_id: str):
    try:
        await supabase.delete_player(user_id)
        return {"message": f"Player {user_id} deleted successfully."}
    except Exception as e:
        logger.error("Error deleting player: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )

@router.get("/parent/{parent_id}", response_model=List[PlayerResponse])
async def get_players_by_parent(parent_id: str):
    """Returns players linked to a specific parent_id"""
    # Parents can only fetch their own children — admins/coaches can fetch any parent's
    current_role = role_ctx.get()
    current_user = user_id_ctx.get()
    if current_role == "parent" and current_user != parent_id:
        raise HTTPException(status_code=403, detail="Access denied — you can only view your own children.")

    try:
        from core.config import settings
        res = await supabase.client.get(
            f"{settings.SUPABASE_URL}/rest/v1/players?parent_id=eq.{parent_id}&select=*,users(full_name)"
        )
        res.raise_for_status()
        data = res.json()
        for p in data:
            if 'users' in p and p['users']:
                p['full_name'] = p['users'].get('full_name', 'Unknown')
            else:
                p['full_name'] = 'Unknown'
        return data
    except Exception as e:
        logger.error("Error fetching parent players: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )


# ─── Photo Upload ──────────────────────────────────────────

@router.post("/upload-photo", dependencies=[Depends(require_role("admin", "super_admin"))])
async def upload_player_photo(file: UploadFile = File(...)):
    """
    Upload a player photo to Supabase Storage (bucket: player-photos).
    Accepts JPEG/PNG, max 2 MB. Returns the public URL.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")

    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Maximum size is 2 MB.")

    import httpx, uuid
    from core.config import settings

    filename = f"players/{uuid.uuid4()}.jpg"
    upload_headers = {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "Content-Type": "image/jpeg",
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{settings.SUPABASE_URL}/storage/v1/object/player-photos/{filename}",
                content=content,
                headers=upload_headers,
            )
        if res.status_code not in [200, 201]:
            logger.error(f"Supabase Storage upload failed: {res.status_code} {res.text}")
            raise HTTPException(status_code=500, detail="Photo upload failed.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Photo upload error: {e}")
        raise HTTPException(status_code=500, detail="Photo upload failed.")

    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/player-photos/{filename}"
    return {"url": public_url}

import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from core.auth_middleware import verify_token, require_role, assert_parent_owns_player
from core.context import user_id_ctx, role_ctx
from typing import List
import secrets
import string

logger = logging.getLogger("players")
from schemas.users import PlayerCreate, PlayerResponse, UserBase
from services.supabase_client import supabase
from urllib.parse import quote

router = APIRouter(prefix="/players", tags=["Players Engine"], dependencies=[Depends(verify_token)])

def generate_temp_password(length=12):
    import string, secrets, random
    lower = string.ascii_lowercase
    upper = string.ascii_uppercase
    digits = string.digits
    special = "!@#$%^&*"
    pwd = [
        secrets.choice(lower),
        secrets.choice(upper),
        secrets.choice(digits),
        secrets.choice(special)
    ]
    pwd += [secrets.choice(lower + upper + digits + special) for _ in range(length - 4)]
    random.shuffle(pwd)
    return "".join(pwd)

@router.get("/", response_model=List[PlayerResponse])
async def get_all_players(user: dict = Depends(require_role("admin", "coach", "super_admin", "sous_admin"))):
    try:
        raw_players = await supabase.get_players()

        # sous_admin: filter to only players in their assigned branches
        if role_ctx.get(None) == "sous_admin":
            uid = user_id_ctx.get(None)
            assigned = await supabase._get(
                f"/rest/v1/sous_admin_branches?user_id=eq.{uid}&select=branch_id"
            )
            allowed_branches = {r["branch_id"] for r in (assigned or [])}
            raw_players = [p for p in raw_players if p.get("branch_id") in allowed_branches]

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
        # --- Duplicate Check: Player Name (via users table with admin headers to bypass RLS) ---
        try:
            import httpx as _httpx
            from core.config import settings as _s
            async with _httpx.AsyncClient(trust_env=False, timeout=10.0) as _c:
                _dup_res = await _c.get(
                    f"{_s.SUPABASE_URL}/rest/v1/users?full_name=eq.{quote(player.full_name)}&role=eq.player&select=id",
                    headers=supabase.admin_headers
                )
                if _dup_res.status_code == 200 and _dup_res.json():
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"A player with this name already exists. | واحد اللاعب بهاد الاسم ديجا كاين: {player.full_name}"
                    )
        except HTTPException:
            raise
        except Exception as dup_err:
            logger.warning("Duplicate check failed (non-critical): %s", dup_err)

        # --- Auto-create parent auth account ---
        temp_password = None
        parent_auth_id = None
        parent_email = getattr(player, 'parent_email', None)
        
        # If no parent email provided, auto-generate one
        if not parent_email:
            parent_email = f"parent_{player.user_id[:8].lower()}@academy.local"

        if parent_email:
            temp_password = generate_temp_password()
            try:
                # Check if parent with this email already exists
                import httpx as _httpx
                from core.config import settings as _s
                existing_parent = None
                async with _httpx.AsyncClient(trust_env=False, timeout=10.0) as _c:
                    # We must query auth users since public.users doesn't have an email column
                    auth_users_res = await _c.get(
                        f"{_s.SUPABASE_URL}/auth/v1/admin/users",
                        headers=supabase.admin_headers
                    )
                    if auth_users_res.status_code == 200:
                        all_users = auth_users_res.json().get('users', [])
                        existing = [u for u in all_users if u.get('email') == parent_email]
                        if existing:
                            existing_parent = existing[0]

                if existing_parent:
                    # Parent already has an account, just link the player
                    parent_auth_id = existing_parent["id"]
                    temp_password = None  # Don't show password for existing parent
                    logger.info("Linking player to existing parent %s", parent_auth_id)
                else:
                    # Create new Supabase Auth user for parent
                    # The Postgres trigger `on_auth_user_created` will automatically insert this user into public.users
                    from core.context import academy_id_ctx
                    academy_id = academy_id_ctx.get(None)
                    
                    auth_user = await supabase.admin_create_user(
                        email=parent_email,
                        password=temp_password,
                        role="parent",
                        full_name=player.parent_name,
                        academy_id=academy_id
                    )
                    parent_auth_id = auth_user["id"]

                    logger.info("Created parent auth account %s for %s", parent_auth_id, parent_email)

            except Exception as parent_err:
                logger.error("Failed to create parent account: %s", parent_err, exc_info=True)
                # Don't block player creation if parent account fails
                # Just log and continue without parent_id
                parent_auth_id = None
                temp_password = None

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
        player_dict = player.model_dump(exclude={"full_name", "parent_email"}, mode='json')
        
        # Link to parent if we created/found one
        if parent_auth_id:
            player_dict["parent_id"] = parent_auth_id

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
        
        # Include parent credentials for admin to share
        if parent_email:
            result["parent_email"] = parent_email
            result["is_new_parent"] = bool(temp_password)
            if temp_password:
                result["temp_password"] = temp_password
        
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


@router.get("/{user_id}", response_model=PlayerResponse)
async def get_player_by_id(user_id: str):
    try:
        from core.config import settings
        res = await supabase.client.get(
            f"{settings.SUPABASE_URL}/rest/v1/players?user_id=eq.{user_id}&select=*,users(full_name)"
        )
        res.raise_for_status()
        data = res.json()
        if not data:
            raise HTTPException(status_code=404, detail="Player not found")
        p = data[0]
        if 'users' in p and p['users']:
            p['full_name'] = p['users'].get('full_name', 'Unknown')
        else:
            p['full_name'] = 'Unknown'
        return p
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching player %s: %s", user_id, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again."
        )


@router.post("/{player_id}/reset-parent-pwd")
async def reset_parent_password(player_id: str, current_user: dict = Depends(verify_token)):
    """Reset the parent's password to a known value for testing purposes."""
    try:
        if current_user.get("role") not in ["admin", "super_admin", "sous_admin"]:
            raise HTTPException(status_code=403, detail="Not authorized")
            
        new_pwd = generate_temp_password()
        
        # Get player's parent_id
        res = await supabase._get(f"/rest/v1/players?user_id=eq.{player_id}&select=parent_id")
        if not res or not res[0].get("parent_id"):
            raise HTTPException(status_code=404, detail="Player has no parent associated")
            
        parent_id = res[0]["parent_id"]
        
        # Reset password
        await supabase.admin_update_user_password(parent_id, new_pwd)
        
        # Get the actual email of the parent to display it
        try:
            parent_auth_user = await supabase.admin_get_user_by_id(parent_id)
            actual_email = parent_auth_user.get("email", "Unknown")
        except Exception as e:
            logger.warning(f"Failed to fetch parent email: {e}")
            actual_email = "Unknown (Check your records)"
        
        return {"success": True, "new_password": new_pwd, "email": actual_email}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting parent password: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{user_id}", response_model=PlayerResponse, dependencies=[Depends(require_role("admin", "super_admin"))])
async def update_player(user_id: str, player: PlayerCreate):
    try:
        # Check if the player already has a parent
        existing_res = await supabase._get(f"/rest/v1/players?user_id=eq.{user_id}&select=parent_id")
        existing_parent_id = existing_res[0].get("parent_id") if existing_res else None

        player_dict = player.model_dump(exclude={"user_id", "full_name", "parent_email"}, mode='json')
        
        # If no parent exists, try to create one if email provided (or auto-generate one)
        if not existing_parent_id:
            parent_email = getattr(player, 'parent_email', None)
            if not parent_email:
                parent_email = f"parent_{user_id[:8].lower()}@academy.local"
                
            try:
                # Check if this email is already a parent
                import httpx as _httpx
                from core.config import settings as _s
                existing_parent = None
                async with _httpx.AsyncClient(trust_env=False, timeout=10.0) as _c:
                    auth_users_res = await _c.get(f"{_s.SUPABASE_URL}/auth/v1/admin/users", headers=supabase.admin_headers)
                    if auth_users_res.status_code == 200:
                        all_users = auth_users_res.json().get('users', [])
                        existing = [u for u in all_users if u.get('email') == parent_email]
                        if existing:
                            existing_parent = existing[0]
                
                if existing_parent:
                    player_dict["parent_id"] = existing_parent["id"]
                else:
                    from core.context import academy_id_ctx
                    auth_user = await supabase.admin_create_user(
                        email=parent_email,
                        password=generate_temp_password(),
                        role="parent",
                        full_name=player.parent_name,
                        academy_id=academy_id_ctx.get(None)
                    )
                    player_dict["parent_id"] = auth_user["id"]
            except Exception as parent_err:
                logger.error("Failed to auto-create parent on update: %s", parent_err)
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
    """Returns players linked to a specific parent_id.
    Also handles impersonation: an admin impersonating a player (role=player)
    can fetch the player's own data by passing the player's user_id as parent_id.
    """
    current_role = role_ctx.get()
    current_user = user_id_ctx.get()

    # Parents can only access their own children
    if current_role == "parent" and current_user != parent_id:
        raise HTTPException(status_code=403, detail="Access denied — you can only view your own children.")

    try:
        import httpx as _httpx
        from core.config import settings

        async with _httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            # Primary lookup: players where parent_id matches
            res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/players?parent_id=eq.{parent_id}&select=*",
                headers=supabase.admin_headers
            )
            res.raise_for_status()
            data = res.json()

            # Fallback: if no children found, check if parent_id is actually a player's user_id
            # This handles the case where admin impersonates a player directly (no parent account)
            if not data:
                res2 = await client.get(
                    f"{settings.SUPABASE_URL}/rest/v1/players?user_id=eq.{parent_id}&select=*",
                    headers=supabase.admin_headers
                )
                if res2.status_code == 200 and res2.json():
                    data = res2.json()

        for p in data:
            if not p.get('full_name'):
                p['full_name'] = p.get('parent_name') or p.get('users', {}).get('full_name', 'Unknown') if isinstance(p.get('users'), dict) else 'Unknown'
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
    _storage_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
    upload_headers = {
        "apikey": _storage_key,
        "Authorization": f"Bearer {_storage_key}",
        "Content-Type": "image/jpeg",
    }
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=30.0) as client:
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

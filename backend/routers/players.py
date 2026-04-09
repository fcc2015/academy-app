from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token, require_role
from typing import List
from schemas.users import PlayerCreate, PlayerResponse, UserBase
from services.supabase_client import supabase
from urllib.parse import quote

router = APIRouter(prefix="/players", tags=["Players Engine"], dependencies=[Depends(verify_token)])

@router.get("/", response_model=List[PlayerResponse])
async def get_all_players():
    try:
        raw_players = await supabase.get_players()
        # Players table now stores full_name directly – no join needed
        for p in raw_players:
            if not p.get('full_name'):
                p['full_name'] = p.get('users', {}).get('full_name', 'Unknown') if isinstance(p.get('users'), dict) else 'Unknown'
        return raw_players
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching players: {str(e)}"
        )

@router.post("/", response_model=PlayerResponse, dependencies=[Depends(require_role("admin", "super_admin"))])
async def create_player(player: PlayerCreate):
    try:
        # --- Duplicate Check: Player Name ---
        existing = await supabase._get(
            f"/rest/v1/players?full_name=eq.{quote(player.full_name)}&select=user_id"
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A player with this name already exists. | واحد اللاعب بهاد الاسم ديجا كاين: {player.full_name}"
            )

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

        # 2. Insert player record (exclude full_name - stored in users table)
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
            print(f"Failed to generate notification: {e}")

        result = response[0]
        result["full_name"] = player.full_name
        return result
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"DEBUG ERROR creating player: {error_msg}")
        if "duplicate" in error_msg.lower() or "23505" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This player already exists. | هاد اللاعب ديجا كاين: {player.full_name}"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating player: {error_msg}"
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating player: {str(e)}"
        )

@router.delete("/{user_id}", dependencies=[Depends(require_role("admin", "super_admin"))])
async def delete_player(user_id: str):
    try:
        await supabase.delete_player(user_id)
        return {"message": f"Player {user_id} deleted successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting player: {str(e)}"
        )

@router.get("/parent/{parent_id}", response_model=List[PlayerResponse])
async def get_players_by_parent(parent_id: str):
    """Returns players linked to a specific parent_id"""
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching parent players: {str(e)}"
        )

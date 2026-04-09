from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form
from core.auth_middleware import verify_token
from pydantic import BaseModel
from typing import Optional, List
from services.supabase_client import supabase
from datetime import datetime, timedelta
from urllib.parse import quote

router = APIRouter(prefix="/chat", tags=["Chat"], dependencies=[Depends(verify_token)])


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    group_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    content: Optional[str] = None
    image_url: Optional[str] = None
    message_type: str = "text"

class TypingRequest(BaseModel):
    group_id: str
    user_id: str
    user_name: str
    is_typing: bool

class JoinGroupRequest(BaseModel):
    group_id: str
    user_id: str
    user_name: str
    user_role: str
    is_moderator: bool = False

class MuteRequest(BaseModel):
    group_id: str
    target_user_id: str
    mute_type: str  # 'temporary' | 'permanent' | 'none'
    mute_minutes: Optional[int] = None

class BanRequest(BaseModel):
    group_id: str
    target_user_id: str
    ban_type: str  # 'temporary' | 'permanent' | 'none'
    ban_minutes: Optional[int] = None

class CreateGroupRequest(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "group"
    category: Optional[str] = None
    squad_id: Optional[str] = None
    created_by: Optional[str] = None


# ─────────────────────────────────────────────
# GET: All Chat Groups
# ─────────────────────────────────────────────

@router.get("/groups")
async def get_chat_groups(user_id: Optional[str] = None, role: Optional[str] = None):
    """Get chat groups based on role"""
    from core.config import settings
    import httpx
    
    async with httpx.AsyncClient() as client:
        if role == "admin" or not role:
            res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/chat_groups?select=*&order=created_at.asc",
                headers=supabase.headers
            )
        else:
            if not user_id:
                return []
            # Get member groups
            member_res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/chat_group_members?user_id=eq.{user_id}&select=group_id",
                headers=supabase.headers
            )
            if member_res.status_code == 200 and member_res.json():
                group_ids = ",".join([m["group_id"] for m in member_res.json()])
                if not group_ids:
                    return []
                res = await client.get(
                    f"{settings.SUPABASE_URL}/rest/v1/chat_groups?id=in.({group_ids})&select=*&order=created_at.asc",
                    headers=supabase.headers
                )
            else:
                return []
                
        res.raise_for_status()
        return res.json()

@router.post("/groups/{group_id}/add_member")
async def force_add_member(group_id: str, req: dict):
    """Admin forcibly adding a member (coach) to a group"""
    import httpx
    from core.config import settings
    
    async with httpx.AsyncClient() as client:
        check_res = await client.get(
            f"{settings.SUPABASE_URL}/rest/v1/chat_group_members?group_id=eq.{group_id}&user_id=eq.{req.get('user_id')}&select=id",
            headers=supabase.headers
        )
        if check_res.status_code == 200 and check_res.json():
            return {"message": "Already a member"}
            
        data = {
            "group_id": group_id,
            "user_id": req.get("user_id"),
            "user_name": req.get("user_name"),
            "user_role": req.get("user_role"),
            "is_moderator": True if req.get("user_role") == "coach" else False
        }
        
        res = await client.post(
            f"{settings.SUPABASE_URL}/rest/v1/chat_group_members",
            json=data,
            headers={**supabase.headers, "Prefer": "return=representation"}
        )
        res.raise_for_status()
        return res.json()


@router.get("/groups/{group_id}")
async def get_chat_group(group_id: str):
    """Get a single chat group with members"""
    import httpx
    from core.config import settings
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{settings.SUPABASE_URL}/rest/v1/chat_groups?id=eq.{group_id}&select=*",
            headers=supabase.headers
        )
        res.raise_for_status()
        data = res.json()
        return data[0] if data else None


@router.get("/groups/{group_id}/members")
async def get_group_members(group_id: str):
    """Get members of a group"""
    import httpx
    from core.config import settings
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{settings.SUPABASE_URL}/rest/v1/chat_group_members?group_id=eq.{group_id}&select=*&order=joined_at.asc",
            headers=supabase.headers
        )
        res.raise_for_status()
        return res.json()


@router.post("/groups/{group_id}/join")
async def join_group(group_id: str, req: JoinGroupRequest):
    """Join a chat group"""
    import httpx
    from core.config import settings

    async with httpx.AsyncClient() as client:
        # Check if already a member
        check_res = await client.get(
            f"{settings.SUPABASE_URL}/rest/v1/chat_group_members?group_id=eq.{group_id}&user_id=eq.{req.user_id}&select=id",
            headers=supabase.headers
        )
        if check_res.status_code == 200 and check_res.json():
            return {"message": "Already a member"}

        data = {
            "group_id": group_id,
            "user_id": req.user_id,
            "user_name": req.user_name,
            "user_role": req.user_role,
            "is_moderator": req.is_moderator
        }
        res = await client.post(
            f"{settings.SUPABASE_URL}/rest/v1/chat_group_members",
            json=data,
            headers={**supabase.headers, "Prefer": "return=representation"}
        )
        res.raise_for_status()
        return res.json()


@router.post("/groups")
async def create_group(req: CreateGroupRequest):
    """Create a new chat group (admin only on frontend)"""
    import httpx
    from core.config import settings

    data = {
        "name": req.name,
        "description": req.description,
        "type": req.type,
        "category": req.category,
        "squad_id": req.squad_id,
        "created_by": req.created_by
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{settings.SUPABASE_URL}/rest/v1/chat_groups",
            json=data,
            headers={**supabase.headers, "Prefer": "return=representation"}
        )
        res.raise_for_status()
        result = res.json()
        return result[0] if result else {}


@router.post("/sync-groups")
async def sync_chat_groups():
    """
    Admin action: Auto-create one chat group per squad.
    Each group gets the squad's coach as moderator and all squad players as members.
    Idempotent — safe to run multiple times.
    """
    import httpx
    from core.config import settings

    created = []
    updated = []

    async with httpx.AsyncClient() as client:
        # 1. Fetch all squads
        squads_res = await client.get(
            f"{settings.SUPABASE_URL}/rest/v1/squads?select=*",
            headers=supabase.headers
        )
        squads_res.raise_for_status()
        squads = squads_res.json()

        # 2. Fetch all players (to map squad → players)
        players_res = await client.get(
            f"{settings.SUPABASE_URL}/rest/v1/players?select=user_id,full_name,squad_id,u_category",
            headers=supabase.headers
        )
        players_res.raise_for_status()
        players = players_res.json()

        # 3. Fetch all coaches
        coaches_res = await client.get(
            f"{settings.SUPABASE_URL}/rest/v1/coaches?select=user_id,full_name,squad_id",
            headers=supabase.headers
        )
        coaches_res.raise_for_status()
        coaches = coaches_res.json()

        # 4. Fetch existing chat groups
        groups_res = await client.get(
            f"{settings.SUPABASE_URL}/rest/v1/chat_groups?select=id,squad_id,name",
            headers=supabase.headers
        )
        groups_res.raise_for_status()
        existing_groups = {g["squad_id"]: g for g in groups_res.json() if g.get("squad_id")}

        for squad in squads:
            squad_id = squad["id"]
            squad_name = squad.get("name", "Groupe")
            squad_category = squad.get("category", "")

            # Check if group already exists for this squad
            if squad_id in existing_groups:
                group = existing_groups[squad_id]
                group_id = group["id"]
                updated.append(group_id)
            else:
                # Create new group
                group_data = {
                    "name": f"{squad_name} — {squad_category}",
                    "description": f"Groupe de la catégorie {squad_category}",
                    "type": "group",
                    "category": squad_category,
                    "squad_id": squad_id,
                    "created_by": "00000000-0000-0000-0000-000000000000"
                }
                create_res = await client.post(
                    f"{settings.SUPABASE_URL}/rest/v1/chat_groups",
                    json=group_data,
                    headers={**supabase.headers, "Prefer": "return=representation"}
                )
                create_res.raise_for_status()
                group = create_res.json()[0]
                group_id = group["id"]
                created.append(group_id)

            # Helper to upsert a member
            async def ensure_member(uid: str, uname: str, urole: str, moderator: bool):
                check = await client.get(
                    f"{settings.SUPABASE_URL}/rest/v1/chat_group_members?group_id=eq.{group_id}&user_id=eq.{uid}&select=id",
                    headers=supabase.headers
                )
                if check.status_code == 200 and check.json():
                    return  # already member
                await client.post(
                    f"{settings.SUPABASE_URL}/rest/v1/chat_group_members",
                    json={
                        "group_id": group_id,
                        "user_id": uid,
                        "user_name": uname,
                        "user_role": urole,
                        "is_moderator": moderator
                    },
                    headers={**supabase.headers, "Prefer": "return=minimal"}
                )

            # Add coach(es) assigned to this squad
            squad_coaches = [c for c in coaches if c.get("squad_id") == squad_id]
            for coach in squad_coaches:
                await ensure_member(coach["user_id"], coach["full_name"], "coach", True)

            # Add players of this squad
            squad_players = [p for p in players if p.get("squad_id") == squad_id]
            for player in squad_players:
                await ensure_member(player["user_id"], player["full_name"], "player", False)

    return {
        "success": True,
        "groups_created": len(created),
        "groups_updated": len(updated),
        "total_squads": len(squads)
    }


# ─────────────────────────────────────────────
# MESSAGES
# ─────────────────────────────────────────────

@router.get("/groups/{group_id}/messages")
async def get_messages(group_id: str, limit: int = 50, offset: int = 0):
    """Get messages for a group"""
    import httpx
    from core.config import settings
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{settings.SUPABASE_URL}/rest/v1/chat_messages?group_id=eq.{group_id}&is_deleted=eq.false&select=*&order=created_at.desc&limit={limit}&offset={offset}",
            headers=supabase.headers
        )
        res.raise_for_status()
        msgs = res.json()
        msgs.reverse()  # Show oldest first
        return msgs


@router.post("/messages")
async def send_message(req: SendMessageRequest):
    """Send a message to a group"""
    import httpx
    from core.config import settings

    async with httpx.AsyncClient() as client:
        # Check if user is muted or banned
        member_res = await client.get(
            f"{settings.SUPABASE_URL}/rest/v1/chat_group_members?group_id=eq.{req.group_id}&user_id=eq.{req.sender_id}&select=*",
            headers=supabase.headers
        )
        if member_res.status_code == 200 and member_res.json():
            member = member_res.json()[0]
            now = datetime.utcnow()

            # Check permanent mute
            if member.get("is_muted") and member.get("mute_type") == "permanent":
                raise HTTPException(status_code=403, detail="You are permanently muted in this group.")

            # Check temporary mute
            if member.get("mute_until"):
                mute_until = datetime.fromisoformat(member["mute_until"].replace("Z", "+00:00")).replace(tzinfo=None)
                if now < mute_until:
                    remaining = int((mute_until - now).total_seconds() / 60)
                    raise HTTPException(status_code=403, detail=f"You are muted for {remaining} more minute(s).")
                else:
                    # Mute expired, clear it
                    await client.patch(
                        f"{settings.SUPABASE_URL}/rest/v1/chat_group_members?group_id=eq.{req.group_id}&user_id=eq.{req.sender_id}",
                        json={"is_muted": False, "mute_until": None, "mute_type": None},
                        headers=supabase.headers
                    )

            # Check ban
            if member.get("banned") and member.get("ban_until"):
                ban_until = datetime.fromisoformat(member["ban_until"].replace("Z", "+00:00")).replace(tzinfo=None)
                if now < ban_until:
                    remaining = int((ban_until - now).total_seconds() / 60)
                    raise HTTPException(status_code=403, detail=f"You are banned for {remaining} more minute(s).")

            if member.get("banned") and not member.get("ban_until"):
                raise HTTPException(status_code=403, detail="You are permanently banned from this group.")

        # Validate: only admins can send images
        if req.message_type == "image" and req.sender_role not in ["admin"]:
            raise HTTPException(status_code=403, detail="Only admins can send images.")

        data = {
            "group_id": req.group_id,
            "sender_id": req.sender_id,
            "sender_name": req.sender_name,
            "sender_role": req.sender_role,
            "content": req.content,
            "image_url": req.image_url,
            "message_type": req.message_type
        }
        res = await client.post(
            f"{settings.SUPABASE_URL}/rest/v1/chat_messages",
            json=data,
            headers={**supabase.headers, "Prefer": "return=representation"}
        )
        res.raise_for_status()
        result = res.json()
        return result[0] if result else {}


@router.delete("/messages/{message_id}")
async def delete_message(message_id: str):
    """Soft delete a message (admin/moderator)"""
    import httpx
    from core.config import settings
    async with httpx.AsyncClient() as client:
        res = await client.patch(
            f"{settings.SUPABASE_URL}/rest/v1/chat_messages?id=eq.{message_id}",
            json={"is_deleted": True, "deleted_at": datetime.utcnow().isoformat()},
            headers=supabase.headers
        )
        res.raise_for_status()
        return {"success": True}


# ─────────────────────────────────────────────
# TYPING INDICATORS
# ─────────────────────────────────────────────

@router.post("/typing")
async def update_typing(req: TypingRequest):
    """Update typing status (upsert)"""
    import httpx
    from core.config import settings

    data = {
        "group_id": req.group_id,
        "user_id": req.user_id,
        "user_name": req.user_name,
        "is_typing": req.is_typing,
        "updated_at": datetime.utcnow().isoformat()
    }
    headers = {**supabase.headers, "Prefer": "resolution=merge-duplicates,return=minimal"}
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{settings.SUPABASE_URL}/rest/v1/chat_typing",
            json=data,
            headers=headers
        )
        res.raise_for_status()
        return {"success": True}


@router.get("/groups/{group_id}/typing")
async def get_typing(group_id: str, exclude_user: Optional[str] = None):
    """Get who is typing in a group (exclude requester)"""
    import httpx
    from core.config import settings

    # Only fetch recent typing (last 5 seconds)
    url = f"{settings.SUPABASE_URL}/rest/v1/chat_typing?group_id=eq.{group_id}&is_typing=eq.true&select=user_name,user_id,updated_at"
    if exclude_user:
        url += f"&user_id=neq.{quote(exclude_user)}"

    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=supabase.headers)
        res.raise_for_status()

        # Filter to only those typing in the last 6 seconds
        now = datetime.utcnow()
        all_typing = res.json()
        active = []
        for t in all_typing:
            try:
                updated = datetime.fromisoformat(t["updated_at"].replace("Z", "+00:00")).replace(tzinfo=None)
                if (now - updated).total_seconds() < 6:
                    active.append(t)
            except Exception:
                pass

        return active


# ─────────────────────────────────────────────
# MODERATION: MUTE & BAN
# ─────────────────────────────────────────────

@router.post("/moderation/mute")
async def mute_user(req: MuteRequest):
    """Mute a user in a group (admin/moderator action)"""
    import httpx
    from core.config import settings

    if req.mute_type == "none":
        # Unmute
        update_data = {"is_muted": False, "mute_until": None, "mute_type": None}
    elif req.mute_type == "permanent":
        update_data = {"is_muted": True, "mute_until": None, "mute_type": "permanent"}
    elif req.mute_type == "temporary":
        if not req.mute_minutes:
            raise HTTPException(status_code=400, detail="mute_minutes required for temporary mute")
        mute_until = (datetime.utcnow() + timedelta(minutes=req.mute_minutes)).isoformat()
        update_data = {"is_muted": True, "mute_until": mute_until, "mute_type": "temporary"}
    else:
        raise HTTPException(status_code=400, detail="Invalid mute_type")

    async with httpx.AsyncClient() as client:
        res = await client.patch(
            f"{settings.SUPABASE_URL}/rest/v1/chat_group_members?group_id=eq.{req.group_id}&user_id=eq.{req.target_user_id}",
            json=update_data,
            headers=supabase.headers
        )
        res.raise_for_status()

    # Send system message
    action = "تم إلغاء الكتم" if req.mute_type == "none" else f"تم الكتم ({req.mute_type})"
    await _send_system_message_async(req.group_id, f"🔇 {action}")
    return {"success": True}


@router.post("/moderation/ban")
async def ban_user(req: BanRequest):
    """Ban a user from a group (admin only)"""
    import httpx
    from core.config import settings

    if req.ban_type == "none":
        update_data = {"banned": False, "ban_until": None}
    elif req.ban_type == "permanent":
        update_data = {"banned": True, "ban_until": None}
    elif req.ban_type == "temporary":
        if not req.ban_minutes:
            raise HTTPException(status_code=400, detail="ban_minutes required for temporary ban")
        ban_until = (datetime.utcnow() + timedelta(minutes=req.ban_minutes)).isoformat()
        update_data = {"banned": True, "ban_until": ban_until}
    else:
        raise HTTPException(status_code=400, detail="Invalid ban_type")

    async with httpx.AsyncClient() as client:
        res = await client.patch(
            f"{settings.SUPABASE_URL}/rest/v1/chat_group_members?group_id=eq.{req.group_id}&user_id=eq.{req.target_user_id}",
            json=update_data,
            headers=supabase.headers
        )
        res.raise_for_status()

    action = "تم إلغاء الحظر" if req.ban_type == "none" else f"تم الحظر ({req.ban_type})"
    await _send_system_message_async(req.group_id, f"🚫 {action}")
    return {"success": True}


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

async def _send_system_message_async(group_id: str, content: str):
    """Internal: send a system message to a group"""
    import httpx
    from core.config import settings
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.SUPABASE_URL}/rest/v1/chat_messages",
                json={
                    "group_id": group_id,
                    "sender_id": "00000000-0000-0000-0000-000000000000",
                    "sender_name": "النظام",
                    "sender_role": "admin",
                    "content": content,
                    "message_type": "system"
                },
                headers={**supabase.headers, "Prefer": "return=minimal"}
            )
    except Exception:
        pass


# ─────────────────────────────────────────────
# IMAGE UPLOAD (admin only)
# ─────────────────────────────────────────────

@router.post("/upload-image")
async def upload_chat_image(
    file: UploadFile = File(...),
    sender_role: str = Form(...)
):
    """Upload image for chat (admin only)"""
    if sender_role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can upload images.")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")

    import httpx
    from core.config import settings
    import uuid

    file_content = await file.read()
    filename = f"chat/{uuid.uuid4()}{file.filename[file.filename.rfind('.'):]}"

    # Upload to Supabase Storage
    upload_headers = {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "Content-Type": file.content_type
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{settings.SUPABASE_URL}/storage/v1/object/chat-images/{filename}",
            content=file_content,
            headers=upload_headers
        )

    if res.status_code not in [200, 201]:
        raise HTTPException(status_code=500, detail="Image upload failed.")

    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/chat-images/{filename}"
    return {"url": public_url, "filename": filename}

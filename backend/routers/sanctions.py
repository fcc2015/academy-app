import logging
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token, require_role
from core.context import user_id_ctx, role_ctx, academy_id_ctx
from core.config import settings
from typing import List, Optional
from schemas.sanctions import SanctionCreate, SanctionApprove, SanctionResponse
from services.supabase_client import supabase

logger = logging.getLogger("sanctions")

router = APIRouter(
    prefix="/sanctions",
    tags=["Disciplinary & Sanctions"],
    dependencies=[Depends(verify_token)]
)

# ─── Sanction Type Labels (Arabic) ────────────────────────────
SANCTION_LABELS_AR = {
    "Warning":    "إنذار",
    "Suspension": "توقيف",
    "Fine":       "غرامة مالية",
    "Match_Ban":  "حرمان من المباريات",
}

# ─── Helper: Remove player from chat groups ────────────────────
async def _remove_player_from_chats(player_id: str):
    """Remove a sanctioned player from all academy chat groups."""
    try:
        _key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
        _headers = {
            "apikey": _key,
            "Authorization": f"Bearer {_key}",
            "Prefer": "return=minimal",
        }
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            res = await client.delete(
                f"{settings.SUPABASE_URL}/rest/v1/chat_group_members?user_id=eq.{player_id}",
                headers=_headers,
            )
            if res.status_code in (200, 204):
                logger.info(f"Player {player_id} removed from all chat groups (sanction)")
            else:
                logger.warning(f"Chat removal HTTP {res.status_code} for player {player_id}")
    except Exception as e:
        logger.warning(f"Chat group removal error: {e}")


# ─── Helper: Update player account_status ─────────────────────
async def _update_player_status(player_id: str, new_status: str):
    """Update the player's account_status (e.g. Suspended)."""
    try:
        _key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
        _headers = {
            "apikey": _key,
            "Authorization": f"Bearer {_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            res = await client.patch(
                f"{settings.SUPABASE_URL}/rest/v1/players?user_id=eq.{player_id}",
                json={"account_status": new_status},
                headers=_headers,
            )
            res.raise_for_status()
            logger.info(f"Player {player_id} account_status → {new_status}")
    except Exception as e:
        logger.warning(f"Player status update error: {e}")


# ─── Helper: Get parent_id for a player ───────────────────────
async def _get_player_parent_id(player_id: str) -> Optional[str]:
    try:
        _key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
        _headers = {
            "apikey": _key,
            "Authorization": f"Bearer {_key}",
        }
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            res = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/players?user_id=eq.{player_id}&select=parent_id",
                headers=_headers,
            )
            if res.status_code == 200:
                data = res.json()
                return data[0].get("parent_id") if data else None
    except Exception as e:
        logger.warning(f"Could not get parent_id: {e}")
    return None


# ─── Helper: Notify parent of approved sanction ───────────────
async def _notify_parent_sanction(sanction: dict):
    """Send a high-priority Arabic notification to the player's parent."""
    player_id   = sanction.get("player_id")
    player_name = sanction.get("player_name", "اللاعب")
    stype       = sanction.get("sanction_type", "Warning")
    reason      = sanction.get("reason", "")
    stype_ar    = SANCTION_LABELS_AR.get(stype, stype)
    amount      = sanction.get("amount", 0)

    # Build message depending on type
    if stype == "Fine" and amount and float(amount) > 0:
        message = (
            f"تنبيه انضباطي هام ⚠️ — تم تسجيل غرامة مالية بقيمة {amount} درهم "
            f"في حق ابنكم(تكم) {player_name} بسبب: {reason}. "
            f"يرجى التواصل مع الإدارة لتسوية الوضع."
        )
    elif stype in ("Suspension", "Match_Ban"):
        message = (
            f"تنبيه انضباطي هام ⚠️ — تم تسجيل عقوبة ({stype_ar}) "
            f"في حق ابنكم(تكم) {player_name} بسبب: {reason}. "
            f"اللاعب ممنوع من المشاركة في المباريات وأُزيل من مجموعات النادي "
            f"إلى حين تسوية الوضع. يرجى التواصل مع الإدارة."
        )
    else:
        message = (
            f"تنبيه انضباطي ⚠️ — تم تسجيل {stype_ar} "
            f"في حق ابنكم(تكم) {player_name} بسبب: {reason}."
        )

    notif_base = {
        "title": f"⚠️ عقوبة انضباطية — {stype_ar}",
        "message": message,
        "type": "disciplinary",
    }

    try:
        # Notify admin
        await supabase.insert_notification({**notif_base, "target_role": "Admin"})

        # Notify coach who issued it
        coach_id = sanction.get("coach_id")
        if coach_id:
            await supabase.insert_notification({**notif_base, "user_id": coach_id})

        # Notify parent
        parent_id = await _get_player_parent_id(player_id)
        if parent_id:
            await supabase.insert_notification({**notif_base, "user_id": parent_id})
            logger.info(f"Sanction notification sent to parent {parent_id}")
        else:
            logger.warning(f"No parent_id found for player {player_id} — no parent notification")
    except Exception as e:
        logger.warning(f"Sanction notification error: {e}")


# ─── POST /sanctions/ — Request a new sanction (Coach or Admin) ─
@router.post("/", response_model=SanctionResponse)
async def create_sanction(
    sanction: SanctionCreate,
    user: dict = Depends(require_role("admin", "coach", "super_admin", "sous_admin"))
):
    """
    Coach or Admin creates a disciplinary sanction request.
    Status starts as 'Pending Approval' — must be endorsed by Admin.
    """
    try:
        current_user   = user_id_ctx.get(None)
        current_role   = role_ctx.get(None)
        current_academy = academy_id_ctx.get(None)

        # Resolve coach name
        coach_name = None
        try:
            coaches = await supabase._get(f"/rest/v1/coaches?user_id=eq.{current_user}&select=full_name")
            if coaches:
                coach_name = coaches[0].get("full_name")
        except Exception:
            pass

        data = {
            "player_id":    sanction.player_id,
            "player_name":  sanction.player_name,
            "sanction_type": sanction.sanction_type,
            "amount":       sanction.amount or 0,
            "reason":       sanction.reason,
            "report_text":  sanction.report_text,
            "status":       "Pending Approval",
            "coach_id":     current_user,
            "coach_name":   coach_name,
        }
        if current_academy:
            data["academy_id"] = current_academy
        if sanction.end_date:
            data["end_date"] = sanction.end_date.isoformat()

        result = await supabase._post("/rest/v1/player_sanctions", data)
        created = result[0] if isinstance(result, list) else result

        # Notify admin of new pending request
        try:
            await supabase.insert_notification({
                "title": "📋 طلب عقوبة انضباطية جديد",
                "message": (
                    f"المدرب {coach_name or 'مدرب'} يطلب تسجيل {SANCTION_LABELS_AR.get(sanction.sanction_type, sanction.sanction_type)} "
                    f"في حق اللاعب {sanction.player_name} بسبب: {sanction.reason}. يرجى المراجعة والتأشير."
                ),
                "type": "admin_alert",
                "target_role": "Admin",
            })
        except Exception as e:
            logger.warning(f"Admin notification error: {e}")

        return created
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating sanction: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ─── GET /sanctions/ — List all sanctions (Admin) ─────────────
@router.get("/", response_model=List[SanctionResponse])
async def get_sanctions(
    status_filter: Optional[str] = None,
    player_id: Optional[str] = None,
    user: dict = Depends(require_role("admin", "coach", "super_admin", "sous_admin"))
):
    """List all sanctions; admins see everything, coaches see their own."""
    try:
        current_role = role_ctx.get(None)
        current_user = user_id_ctx.get(None)

        url = "/rest/v1/player_sanctions?select=*&order=created_at.desc"
        if status_filter:
            url += f"&status=eq.{status_filter}"
        if player_id:
            url += f"&player_id=eq.{player_id}"
        if current_role == "coach":
            url += f"&coach_id=eq.{current_user}"

        return await supabase._get(url)
    except Exception as e:
        logger.error("Error fetching sanctions: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ─── GET /sanctions/player/{player_id} — Player sanctions ─────
@router.get("/player/{player_id}", response_model=List[SanctionResponse])
async def get_player_sanctions(player_id: str):
    """
    Get all sanctions for a specific player.
    Parents can only access this for their own child (enforced by their player_id).
    """
    try:
        url = f"/rest/v1/player_sanctions?player_id=eq.{player_id}&order=created_at.desc"
        return await supabase._get(url)
    except Exception as e:
        logger.error("Error fetching player sanctions: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ─── GET /sanctions/active/player/{player_id} — Active sanctions only
@router.get("/active/player/{player_id}")
async def get_active_player_sanctions(player_id: str):
    """Get only active (approved) sanctions for a player — used by parent dashboard."""
    try:
        url = (
            f"/rest/v1/player_sanctions"
            f"?player_id=eq.{player_id}"
            f"&status=eq.Approved"
            f"&order=created_at.desc"
        )
        return await supabase._get(url)
    except Exception as e:
        logger.error("Error fetching active sanctions: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ─── PATCH /sanctions/{sanction_id}/approve — Admin endorses ──
@router.patch("/{sanction_id}/approve")
async def approve_sanction(
    sanction_id: str,
    body: SanctionApprove,
    user: dict = Depends(require_role("admin", "super_admin"))
):
    """
    Admin approves or rejects a pending sanction request.
    On approval:
      - For Suspension / Match_Ban: remove from all chat groups, mark player Suspended
      - For Fine: mark player's fine as pending
      - Send Arabic notification to parent
    """
    try:
        current_user = user_id_ctx.get(None)

        # Fetch the sanction
        sanctions_data = await supabase._get(
            f"/rest/v1/player_sanctions?id=eq.{sanction_id}&select=*"
        )
        if not sanctions_data:
            raise HTTPException(status_code=404, detail="Sanction not found")
        sanction = sanctions_data[0]

        if sanction["status"] not in ("Pending Approval",):
            raise HTTPException(
                status_code=409,
                detail=f"Sanction is already {sanction['status']}. Cannot change."
            )

        now_iso = datetime.now(timezone.utc).isoformat()

        if body.approved:
            # ── APPROVE ──
            update_data = {
                "status": "Approved",
                "approved_at": now_iso,
                "approved_by": current_user,
            }

            # Update the sanction record
            _key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
            _headers = {
                "apikey": _key,
                "Authorization": f"Bearer {_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            }
            async with httpx.AsyncClient(trust_env=False, timeout=15.0) as client:
                res = await client.patch(
                    f"{settings.SUPABASE_URL}/rest/v1/player_sanctions?id=eq.{sanction_id}",
                    json=update_data,
                    headers=_headers,
                )
                res.raise_for_status()

            player_id   = sanction["player_id"]
            stype       = sanction.get("sanction_type", "Warning")

            # ── Execute Suspension Actions ──
            if stype in ("Suspension", "Match_Ban"):
                await _update_player_status(player_id, "Suspended")
                await _remove_player_from_chats(player_id)

            # ── Fine: create a pending invoice ──
            amount = sanction.get("amount", 0)
            if stype == "Fine" and amount and float(amount) > 0:
                try:
                    from datetime import date as _date
                    fine_payment = {
                        "player_id": player_id,
                        "amount": float(amount),
                        "amount_due": float(amount),
                        "status": "Pending",
                        "payment_method": "Cash",
                        "payment_date": _date.today().isoformat(),
                        "notes": f"غرامة انضباطية — {sanction.get('reason', '')}",
                    }
                    # Get user_id from player
                    parent_id = await _get_player_parent_id(player_id)
                    if parent_id:
                        fine_payment["user_id"] = parent_id
                    await supabase.insert_payment(fine_payment)
                    logger.info(f"Fine invoice created for player {player_id}: {amount} MAD")
                except Exception as e:
                    logger.warning(f"Fine invoice creation error: {e}")

            # ── Notify parent ──
            await _notify_parent_sanction({**sanction, **update_data})

            return {
                "success": True,
                "status": "Approved",
                "message": f"Sanction approved. Player {player_id} actions executed.",
            }

        else:
            # ── REJECT ──
            update_data = {"status": "Rejected"}
            _key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
            _headers = {
                "apikey": _key,
                "Authorization": f"Bearer {_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            }
            async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
                res = await client.patch(
                    f"{settings.SUPABASE_URL}/rest/v1/player_sanctions?id=eq.{sanction_id}",
                    json=update_data,
                    headers=_headers,
                )
                res.raise_for_status()

            # Notify coach of rejection
            coach_id = sanction.get("coach_id")
            if coach_id:
                try:
                    await supabase.insert_notification({
                        "user_id": coach_id,
                        "title": "رفض طلب العقوبة",
                        "message": (
                            f"تم رفض طلب العقوبة الخاصة باللاعب {sanction.get('player_name', '')} "
                            f"بسبب: {sanction.get('reason', '')}. تواصل مع الإدارة للمزيد."
                        ),
                        "type": "info",
                    })
                except Exception as e:
                    logger.warning(f"Rejection notification error: {e}")

            return {"success": True, "status": "Rejected"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error approving sanction: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ─── PATCH /sanctions/{sanction_id}/cancel — Cancel/lift a sanction ──
@router.patch("/{sanction_id}/cancel")
async def cancel_sanction(
    sanction_id: str,
    user: dict = Depends(require_role("admin", "super_admin"))
):
    """
    Admin cancels / lifts an approved sanction.
    If it was a Suspension/Match_Ban, restores player to Active.
    """
    try:
        sanctions_data = await supabase._get(
            f"/rest/v1/player_sanctions?id=eq.{sanction_id}&select=*"
        )
        if not sanctions_data:
            raise HTTPException(status_code=404, detail="Sanction not found")
        sanction = sanctions_data[0]

        _key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
        _headers = {
            "apikey": _key,
            "Authorization": f"Bearer {_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            res = await client.patch(
                f"{settings.SUPABASE_URL}/rest/v1/player_sanctions?id=eq.{sanction_id}",
                json={"status": "Cancelled"},
                headers=_headers,
            )
            res.raise_for_status()

        # Restore player if it was a suspension
        stype = sanction.get("sanction_type", "Warning")
        player_id = sanction["player_id"]
        if stype in ("Suspension", "Match_Ban"):
            await _update_player_status(player_id, "Active")

        # Notify parent that sanction is lifted
        parent_id = await _get_player_parent_id(player_id)
        if parent_id:
            try:
                await supabase.insert_notification({
                    "user_id": parent_id,
                    "title": "✅ رُفعت العقوبة الانضباطية",
                    "message": (
                        f"يسعدنا إبلاغكم بأنه تم رفع العقوبة الانضباطية عن اللاعب "
                        f"{sanction.get('player_name', '')} وإعادة تفعيل حسابه."
                    ),
                    "type": "success",
                })
            except Exception as e:
                logger.warning(f"Cancellation notification error: {e}")

        return {"success": True, "status": "Cancelled", "player_restored": stype in ("Suspension", "Match_Ban")}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error cancelling sanction: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

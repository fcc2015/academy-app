import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel, EmailStr
import httpx
from datetime import datetime, timezone
from core.auth_middleware import require_role

logger = logging.getLogger("saas_admin")
from services.supabase_client import supabase
from urllib.parse import quote

router = APIRouter(
    prefix="/saas",
    tags=["SaaS Admin"],
    dependencies=[Depends(require_role("super_admin"))]
)

# ── Schemas ──

class AcademyProvisionRequest(BaseModel):
    name: str
    custom_domain: str | None = None
    admin_email: EmailStr
    admin_password: str
    admin_name: str
    city: str | None = None
    notes: str | None = None
    subdomain: str | None = None

class AcademyStatusUpdate(BaseModel):
    status: str  # "active" or "suspended"

class AcademyUpdateRequest(BaseModel):
    name: str | None = None
    city: str | None = None
    notes: str | None = None
    status: str | None = None
    primary_color: str | None = None
    custom_domain: str | None = None
    logo_url: str | None = None

class DomainAssignment(BaseModel):
    custom_domain: str

class PlanAssignment(BaseModel):
    plan_id: str
    pro_rata_amount: float | None = None
    pro_rata_credit: float | None = None
    upgrade_type: str | None = None  # "upgrade"

class NotificationTriggerRequest(BaseModel):
    thresholds: list[int] = [50, 75, 90, 100]

class RenewalReminderRequest(BaseModel):
    days_ahead: int = 7  # Send reminders for academies renewing within N days

# ── Plan limits (must match frontend PLANS) ──
PLAN_LIMITS = {
    "free":       {"players": 15,   "admins": 1,  "coaches": 1},
    "pro":        {"players": 100,  "admins": 4,  "coaches": 10},
    "enterprise": {"players": -1,   "admins": -1, "coaches": -1},
}

# ── Academy CRUD ──

@router.get("/academies")
async def get_academies():
    """Get all academies with real-time usage counts."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Fetch academies, players, admins, coaches in parallel
        import asyncio
        tasks = [
            client.get(
                f"{supabase.url}/rest/v1/academies?select=*&order=created_at.desc",
                headers=supabase.admin_headers
            ),
            client.get(
                f"{supabase.url}/rest/v1/players?select=academy_id",
                headers=supabase.admin_headers
            ),
            client.get(
                f"{supabase.url}/rest/v1/admins?select=academy_id",
                headers=supabase.admin_headers
            ),
            client.get(
                f"{supabase.url}/rest/v1/coaches?select=academy_id",
                headers=supabase.admin_headers
            ),
        ]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

    academies = responses[0].json() if not isinstance(responses[0], Exception) and responses[0].status_code == 200 else []

    # Build count maps per academy_id
    def count_by_academy(res):
        if isinstance(res, Exception) or res.status_code != 200:
            return {}
        counts = {}
        for row in res.json():
            aid = row.get("academy_id")
            if aid:
                counts[aid] = counts.get(aid, 0) + 1
        return counts

    players_map = count_by_academy(responses[1])
    admins_map  = count_by_academy(responses[2])
    coaches_map = count_by_academy(responses[3])

    # Enrich each academy with usage counts
    for acc in academies:
        aid = acc.get("id")
        limits = PLAN_LIMITS.get(acc.get("plan_id", "free"), PLAN_LIMITS["free"])
        acc["players_count"] = players_map.get(aid, 0)
        acc["admins_count"]  = admins_map.get(aid, 0)
        acc["coaches_count"] = coaches_map.get(aid, 0)
        acc["plan_limits"]   = limits

    return academies


@router.post("/academies")
async def create_academy(req: AcademyProvisionRequest):
    """Provision a new client academy and its root admin.
    Uses service_role (admin_headers) for all DB writes — super_admin bypasses RLS."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Dedup checks
        r = await client.get(
            f"{supabase.url}/rest/v1/academies?name=eq.{quote(req.name)}&select=id",
            headers=supabase.admin_headers,
        )
        if r.status_code == 200 and r.json():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An academy with this name already exists. | واحد الأكاديمية بهاد الاسم ديجا كاينة: {req.name}",
            )
        r = await client.get(
            f"{supabase.url}/rest/v1/admins?email=eq.{quote(str(req.admin_email))}&select=id",
            headers=supabase.admin_headers,
        )
        if r.status_code == 200 and r.json():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This email is already used by another admin. | هاد الإيميل ديجا مستعمل من طرف أدمين آخر: {req.admin_email}",
            )

        academy_data = {
            "name": req.name,
            "custom_domain": req.custom_domain,
            "domain_status": "pending" if req.custom_domain else None,
            "status": "active",
        }
        if req.city:
            academy_data["city"] = req.city
        if req.notes:
            academy_data["notes"] = req.notes
        if req.subdomain:
            academy_data["subdomain"] = req.subdomain

        async def insert_academy(payload):
            return await client.post(
                f"{supabase.url}/rest/v1/academies?select=id",
                json=payload,
                headers=supabase.admin_headers,
            )

        res = await insert_academy(academy_data)
        if res.status_code >= 400:
            body = res.text
            if "23505" in body or "duplicate" in body.lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An academy with this name or subdomain already exists.",
                )
            if "42703" in body or "does not exist" in body.lower():
                safe_data = {k: v for k, v in academy_data.items() if k not in ("city", "notes", "subdomain")}
                res = await insert_academy(safe_data)
                if res.status_code >= 400:
                    logger.error("Academy insert failed even after fallback: %s %s", res.status_code, res.text)
                    raise HTTPException(status_code=500, detail=f"DB error: {res.text[:200]}")
            else:
                logger.error("Academy insert failed: %s %s", res.status_code, res.text)
                raise HTTPException(status_code=500, detail=f"DB error: {res.text[:200]}")

        rows = res.json()
        academy_row = rows[0] if isinstance(rows, list) else rows
        new_academy_id = academy_row["id"]

        try:
            auth_res = await supabase.admin_create_user(
                email=req.admin_email,
                password=req.admin_password,
                role="admin",
                full_name=req.admin_name,
                academy_id=new_academy_id,
            )
            admin_user_id = auth_res.get("id")

            u_res = await client.post(
                f"{supabase.url}/rest/v1/users",
                json={
                    "id": admin_user_id, "full_name": req.admin_name,
                    "role": "admin", "academy_id": new_academy_id,
                },
                headers=supabase.admin_headers,
            )
            if u_res.status_code >= 400:
                logger.warning("users insert non-critical: %s %s", u_res.status_code, u_res.text)

            a_res = await client.post(
                f"{supabase.url}/rest/v1/admins",
                json={
                    "user_id": admin_user_id, "email": req.admin_email,
                    "full_name": req.admin_name, "status": "active", "academy_id": new_academy_id,
                },
                headers=supabase.admin_headers,
            )
            if a_res.status_code >= 400:
                logger.error("admins insert failed: %s %s", a_res.status_code, a_res.text)
                raise HTTPException(status_code=500, detail=f"Admin record insert failed: {a_res.text[:200]}")

            return {"success": True, "academy": academy_row, "admin_user_id": admin_user_id}
        except HTTPException:
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error("Failed to provision academy admin: %s", e, exc_info=True)
            if "duplicate" in error_msg.lower() or "23505" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"This email already exists: {req.admin_email}",
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Academy created, but failed to provision admin: {error_msg[:200]}",
            )


@router.patch("/academies/{academy_id}")
async def update_academy(academy_id: str, data: AcademyStatusUpdate):
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json={"status": data.status},
            headers=supabase.admin_headers
        )
        res.raise_for_status()
        return res.json()


@router.put("/academies/{academy_id}")
async def full_update_academy(academy_id: str, data: AcademyUpdateRequest):
    """Full update of academy details: name, city, notes, status, color."""
    patch = {k: v for k, v in data.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update.")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Try full patch — if city/notes columns don't exist, fall back to safe fields
        res = await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json=patch,
            headers=supabase.admin_headers
        )
        if res.status_code >= 400:
            # Retry with only safe known columns
            safe = {k: v for k, v in patch.items() if k in ("name", "status", "primary_color", "custom_domain")}
            if safe:
                res = await client.patch(
                    f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
                    json=safe,
                    headers=supabase.admin_headers
                )
                res.raise_for_status()
                return {"success": True, "note": "city/notes columns not yet in DB — only safe fields updated."}
            res.raise_for_status()
    return {"success": True}


# ── Logo Upload ──

@router.post("/academies/{academy_id}/logo")
async def upload_academy_logo(academy_id: str, file: UploadFile = File(...)):
    """Upload a logo image for an academy (JPEG/PNG/WebP/SVG, max 2MB)."""
    allowed = {"image/jpeg", "image/png", "image/webp", "image/svg+xml"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP or SVG allowed.")

    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 2MB.")

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "png"
    file_path = f"logos/academy_{academy_id}.{ext}"

    url = await supabase.upload_file("avatars", file_path, content, file.content_type)

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json={"logo_url": url},
            headers={**supabase.admin_headers, "Prefer": "return=minimal"}
        )
        if res.status_code >= 400:
            logger.warning("Could not persist logo_url to academies table: %s", res.text)

    return {"logo_url": url}


# ── Delete Academy ──

@router.delete("/academies/{academy_id}")
async def delete_academy(academy_id: str):
    """Permanently delete an academy and all associated data."""
    import asyncio

    async with httpx.AsyncClient(timeout=30.0) as client:
        # First verify it exists
        check = await client.get(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}&select=id,name",
            headers=supabase.admin_headers
        )
        if check.status_code != 200 or not check.json():
            raise HTTPException(status_code=404, detail="Academy not found.")

        # Delete related data in parallel
        delete_tasks = []
        for table in ["players", "coaches", "admins", "squads", "notifications"]:
            delete_tasks.append(
                client.delete(
                    f"{supabase.url}/rest/v1/{table}?academy_id=eq.{academy_id}",
                    headers=supabase.admin_headers
                )
            )
        delete_tasks.append(
            client.delete(
                f"{supabase.url}/rest/v1/payments_gateway?academy_id=eq.{academy_id}",
                headers=supabase.admin_headers
            )
        )
        await asyncio.gather(*delete_tasks, return_exceptions=True)

        # Finally delete the academy itself
        res = await client.delete(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            headers=supabase.admin_headers
        )
        if res.status_code >= 400:
            raise HTTPException(status_code=500, detail="Failed to delete academy.")

    return {"success": True, "deleted": academy_id}


# ── Bulk Status Update ──

class BulkStatusUpdate(BaseModel):
    academy_ids: list[str]
    status: str  # "active" or "suspended"


@router.patch("/academies-bulk/status")
async def bulk_update_status(data: BulkStatusUpdate):
    """Suspend or activate multiple academies at once."""
    if data.status not in ("active", "suspended"):
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'suspended'.")
    if not data.academy_ids:
        raise HTTPException(status_code=400, detail="No academy IDs provided.")

    import asyncio
    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = [
            client.patch(
                f"{supabase.url}/rest/v1/academies?id=eq.{aid}",
                json={"status": data.status},
                headers=supabase.admin_headers
            )
            for aid in data.academy_ids
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    success = sum(1 for r in results if not isinstance(r, Exception) and r.status_code < 400)
    return {"success": True, "updated": success, "total": len(data.academy_ids)}


# ── Academy Detail View ──

@router.get("/academies/{academy_id}/details")
async def get_academy_details(academy_id: str):
    """Get full details for a single academy: info, admins, coaches, players, payments."""
    import asyncio

    async with httpx.AsyncClient(timeout=30.0) as client:
        responses = await asyncio.gather(
            client.get(
                f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}&select=*",
                headers=supabase.admin_headers
            ),
            client.get(
                f"{supabase.url}/rest/v1/admins?academy_id=eq.{academy_id}&select=id,user_id,full_name,email,status,created_at",
                headers=supabase.admin_headers
            ),
            client.get(
                f"{supabase.url}/rest/v1/coaches?academy_id=eq.{academy_id}&select=id,full_name,email,phone,status,specialty,created_at",
                headers=supabase.admin_headers
            ),
            client.get(
                f"{supabase.url}/rest/v1/players?academy_id=eq.{academy_id}&select=id,full_name,date_of_birth,position,squad_id,status,created_at&order=created_at.desc",
                headers=supabase.admin_headers
            ),
            client.get(
                f"{supabase.url}/rest/v1/squads?academy_id=eq.{academy_id}&select=id,name,category,created_at",
                headers=supabase.admin_headers
            ),
            client.get(
                f"{supabase.url}/rest/v1/payments_gateway?academy_id=eq.{academy_id}&select=*&order=created_at.desc&limit=20",
                headers=supabase.admin_headers
            ),
            return_exceptions=True
        )

    def safe_json(res, fallback=[]):
        if isinstance(res, Exception) or res.status_code != 200:
            return fallback
        return res.json()

    academies = safe_json(responses[0])
    if not academies:
        raise HTTPException(status_code=404, detail="Academy not found.")

    academy = academies[0]
    admins = safe_json(responses[1])
    coaches = safe_json(responses[2])
    players = safe_json(responses[3])
    squads = safe_json(responses[4])
    payments = safe_json(responses[5])

    # Enrich with limits and counts
    plan = academy.get("plan_id") or "free"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

    # Build recent activity timeline from created_at dates
    activity = []
    for p in players[:10]:
        activity.append({
            "type": "player_added",
            "name": p.get("full_name", "Unknown"),
            "date": p.get("created_at"),
        })
    for c in coaches:
        activity.append({
            "type": "coach_added",
            "name": c.get("full_name", "Unknown"),
            "date": c.get("created_at"),
        })
    for pay in payments[:5]:
        activity.append({
            "type": "payment",
            "name": f"{pay.get('amount', 0)} {pay.get('currency', 'MAD')} — {pay.get('status', 'unknown')}",
            "date": pay.get("created_at"),
        })
    # Sort by date desc
    activity.sort(key=lambda x: x.get("date") or "", reverse=True)

    return {
        "academy": academy,
        "admins": admins,
        "coaches": coaches,
        "players_count": len(players),
        "players_recent": players[:20],
        "squads": squads,
        "payments": payments,
        "limits": limits,
        "activity": activity[:15],
        "stats": {
            "total_players": len(players),
            "total_coaches": len(coaches),
            "total_admins": len(admins),
            "total_squads": len(squads),
            "total_payments": len(payments),
            "revenue": sum(float(p.get("amount", 0)) for p in payments if p.get("status") == "completed"),
        }
    }


# ── Domain Management ──

@router.patch("/academies/{academy_id}/domain")
async def assign_domain(academy_id: str, data: DomainAssignment):
    domain = data.custom_domain.strip().lower()
    if not domain or '.' not in domain:
        raise HTTPException(status_code=400, detail="Invalid domain format.")
    existing = await supabase._get(f"/rest/v1/academies?custom_domain=eq.{quote(domain)}&select=id")
    if existing and str(existing[0].get("id", "")) != str(academy_id):
        raise HTTPException(status_code=409, detail="This domain is already assigned to another academy.")
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json={"custom_domain": domain, "domain_status": "pending"},
            headers=supabase.admin_headers
        )
        res.raise_for_status()
        return res.json()


@router.delete("/academies/{academy_id}/domain")
async def remove_domain(academy_id: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json={"custom_domain": None, "domain_status": None},
            headers=supabase.admin_headers
        )
        res.raise_for_status()
        return {"success": True}


@router.post("/academies/{academy_id}/domain/verify")
async def verify_domain(academy_id: str):
    import socket
    academies = await supabase._get(f"/rest/v1/academies?id=eq.{academy_id}&select=custom_domain")
    if not academies or not academies[0].get("custom_domain"):
        raise HTTPException(status_code=404, detail="No domain configured for this academy.")
    domain = academies[0]["custom_domain"]
    resolved_ip = None
    cname_target = None
    domain_status = "pending"
    try:
        import subprocess
        result = subprocess.run(["nslookup", "-type=CNAME", domain],
            capture_output=True, text=True, timeout=10)
        if "netlify" in result.stdout.lower():
            cname_target = "netlify"
            domain_status = "verified"
    except Exception as e:
        logger.debug("nslookup check failed for %s: %s", domain, e)
    if domain_status != "verified":
        try:
            resolved_ip = socket.gethostbyname(domain)
            domain_status = "verified"
        except socket.gaierror:
            domain_status = "pending"
    async with httpx.AsyncClient(timeout=30.0) as client:
        await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json={"domain_status": domain_status},
            headers=supabase.admin_headers
        )
    return {"domain": domain, "status": domain_status, "resolved_ip": resolved_ip, "cname_target": cname_target}


# ── Plan Assignment ──

@router.patch("/academies/{academy_id}/plan")
async def assign_plan(academy_id: str, data: PlanAssignment):
    """Assign or upgrade a subscription plan — records billing_cycle_start and pro-rata info."""
    now_iso = datetime.now(timezone.utc).isoformat()

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Try with all new fields first; fall back to plan_id only if columns don't exist yet
        patch_data = {
            "plan_id": data.plan_id,
            "subscription_status": "active",
            "billing_cycle_start": now_iso,
        }
        res = await client.patch(
            f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
            json=patch_data,
            headers=supabase.admin_headers
        )
        if res.status_code >= 400:
            # Columns may not exist yet — retry with only plan_id
            res = await client.patch(
                f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}",
                json={"plan_id": data.plan_id},
                headers=supabase.admin_headers
            )
            res.raise_for_status()

        # Record a payment transaction if there's a charge
        if data.pro_rata_amount and data.pro_rata_amount > 0:
            try:
                await client.post(
                    f"{supabase.url}/rest/v1/payments_gateway",
                    json={
                        "academy_id": academy_id,
                        "amount": data.pro_rata_amount,
                        "currency": "MAD",
                        "status": "pending",
                        "description": f"Plan upgrade to {data.plan_id} (pro-rata)",
                        "created_at": now_iso,
                    },
                    headers=supabase.admin_headers
                )
            except Exception as e:
                logger.warning(f"Payment record (non-critical): {e}")

        return {"success": True, "plan_id": data.plan_id, "billing_cycle_start": now_iso}


# ── Platform Stats ──

@router.get("/stats")
async def get_saas_stats():
    import asyncio
    try:
        async with httpx.AsyncClient(timeout=30.0, headers=supabase.admin_headers) as client:
            responses = await asyncio.gather(
                client.get(f"{supabase.url}/rest/v1/academies?select=id,status,custom_domain,domain_status"),
                client.get(f"{supabase.url}/rest/v1/users?select=id"),
                client.get(f"{supabase.url}/rest/v1/payments?select=amount"),
                client.get(f"{supabase.url}/rest/v1/players?select=id"),
                return_exceptions=True
            )
        academies_data = responses[0].json() if not isinstance(responses[0], Exception) and responses[0].status_code == 200 else []
        total_academies   = len(academies_data)
        active_academies  = len([a for a in academies_data if a.get("status") != "suspended"])
        domains_configured = len([a for a in academies_data if a.get("custom_domain")])
        domains_verified   = len([a for a in academies_data if a.get("domain_status") == "verified"])
        total_users = len(responses[1].json()) if not isinstance(responses[1], Exception) and responses[1].status_code == 200 else 0
        total_mrr   = sum(p.get("amount", 0) for p in responses[2].json()) if not isinstance(responses[2], Exception) and responses[2].status_code == 200 else 0
        total_players = len(responses[3].json()) if not isinstance(responses[3], Exception) and responses[3].status_code == 200 else 0
        return {
            "total_academies": total_academies,
            "active_academies": active_academies,
            "total_users": total_users,
            "total_mrr": total_mrr,
            "total_players": total_players,
            "domains_configured": domains_configured,
            "domains_verified": domains_verified,
        }
    except Exception as e:
        logger.error("SaaS stats fetch failed: %s", e, exc_info=True)
        return {"total_academies": 0, "active_academies": 0, "total_users": 0,
                "total_mrr": 0, "total_players": 0, "domains_configured": 0, "domains_verified": 0}


# ── Notifications Trigger ──

def _usage_pct(count: int, limit: int) -> int:
    if limit == -1:
        return 0  # unlimited
    if limit == 0:
        return 100
    return min(100, round((count / limit) * 100))

THRESHOLD_MESSAGES = {
    50:  ("⚡ 50% Plan Usage Reached",  "Your academy has used 50% of its plan limits. Consider upgrading your plan."),
    75:  ("⚠️ 75% Plan Usage Reached",  "Your academy is at 75% of its plan limits. Upgrade soon to avoid service disruption."),
    90:  ("🔴 Critical: 90% Usage",     "Your academy is at 90% of plan limits. Upgrade immediately to avoid interruption."),
    100: ("🚨 Plan Limit Exceeded",     "Your academy has exceeded its plan limits. Please upgrade your plan immediately."),
}

@router.post("/notifications/trigger")
async def trigger_usage_notifications(req: NotificationTriggerRequest):
    """
    Check all academies usage against thresholds and send notifications to at-risk academies.
    Returns a summary of notifications sent.
    """
    import asyncio
    async with httpx.AsyncClient(timeout=30.0) as client:
        responses = await asyncio.gather(
            client.get(f"{supabase.url}/rest/v1/academies?select=id,name,plan_id,status&order=created_at.desc",
                       headers=supabase.admin_headers),
            client.get(f"{supabase.url}/rest/v1/players?select=academy_id", headers=supabase.admin_headers),
            client.get(f"{supabase.url}/rest/v1/admins?select=academy_id,user_id", headers=supabase.admin_headers),
            client.get(f"{supabase.url}/rest/v1/coaches?select=academy_id", headers=supabase.admin_headers),
            return_exceptions=True
        )

    academies = responses[0].json() if not isinstance(responses[0], Exception) and responses[0].status_code == 200 else []

    def count_map(res):
        if isinstance(res, Exception) or res.status_code != 200:
            return {}
        m = {}
        for row in res.json():
            aid = row.get("academy_id")
            if aid:
                m[aid] = m.get(aid, 0) + 1
        return m

    def admin_user_map(res):
        """Map academy_id → first admin user_id for notification targeting."""
        if isinstance(res, Exception) or res.status_code != 200:
            return {}
        m = {}
        for row in res.json():
            aid = row.get("academy_id")
            uid = row.get("user_id")
            if aid and uid and aid not in m:
                m[aid] = uid
        return m

    players_map = count_map(responses[1])
    admins_map  = count_map(responses[2])
    coaches_map = count_map(responses[3])
    admin_uid_map = admin_user_map(responses[2])

    sent = []
    skipped = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for acc in academies:
            if acc.get("status") == "suspended":
                continue
            aid = acc["id"]
            limits = PLAN_LIMITS.get(acc.get("plan_id", "free"), PLAN_LIMITS["free"])
            pcts = {
                "players": _usage_pct(players_map.get(aid, 0), limits["players"]),
                "admins":  _usage_pct(admins_map.get(aid, 0),  limits["admins"]),
                "coaches": _usage_pct(coaches_map.get(aid, 0), limits["coaches"]),
            }
            max_pct = max(pcts.values())

            # Find highest triggered threshold from the requested thresholds
            triggered = [t for t in sorted(req.thresholds, reverse=True) if max_pct >= t]
            if not triggered:
                skipped.append(acc["name"])
                continue

            threshold = triggered[0]
            title, message = THRESHOLD_MESSAGES.get(threshold, ("Plan Usage Alert", "Your academy is approaching plan limits."))

            admin_uid = admin_uid_map.get(aid)
            notif_data = {
                "title": title,
                "message": f"{message} (Players: {pcts['players']}%, Admins: {pcts['admins']}%, Coaches: {pcts['coaches']}%)",
                "type": "usage_alert",
                "target_role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            if admin_uid:
                notif_data["user_id"] = admin_uid

            try:
                await client.post(
                    f"{supabase.url}/rest/v1/notifications",
                    json=notif_data,
                    headers=supabase.admin_headers
                )
                sent.append({"academy": acc["name"], "threshold": threshold, "max_pct": max_pct})
            except Exception as e:
                logger.warning(f"Notification send failed for {acc['name']}: {e}")

    return {
        "success": True,
        "notifications_sent": len(sent),
        "details": sent,
        "skipped": skipped,
    }


# ── Analytics ──

@router.get("/analytics")
async def get_saas_analytics():
    """Get analytics data for charts: monthly growth, MRR trend, plan & city distribution."""
    import asyncio
    from collections import defaultdict

    async with httpx.AsyncClient(timeout=30.0) as client:
        responses = await asyncio.gather(
            client.get(
                f"{supabase.url}/rest/v1/academies?select=id,created_at,plan_id,city,status",
                headers=supabase.admin_headers
            ),
            client.get(
                f"{supabase.url}/rest/v1/payments_gateway?select=amount,created_at,status",
                headers=supabase.admin_headers
            ),
            return_exceptions=True
        )

    academies = (
        responses[0].json()
        if not isinstance(responses[0], Exception) and responses[0].status_code == 200
        else []
    )
    payments = (
        responses[1].json()
        if not isinstance(responses[1], Exception) and responses[1].status_code == 200
        else []
    )

    PLAN_PRICES = {"free": 0, "pro": 499, "enterprise": 999}

    # Monthly academy growth
    monthly_academies: dict[str, int] = defaultdict(int)
    for acc in academies:
        try:
            dt = datetime.fromisoformat(acc["created_at"].replace("Z", "+00:00"))
            monthly_academies[dt.strftime("%Y-%m")] += 1
        except Exception as e:
            logger.debug("Skipping academy date parse: %s", e)

    # Monthly revenue from completed payments
    monthly_revenue: dict[str, float] = defaultdict(float)
    for p in payments:
        if p.get("status") == "completed":
            try:
                dt = datetime.fromisoformat(p["created_at"].replace("Z", "+00:00"))
                monthly_revenue[dt.strftime("%Y-%m")] += float(p.get("amount", 0))
            except Exception as e:
                logger.debug("Skipping payment date parse: %s", e)

    # Plan distribution
    plan_counts: dict[str, int] = defaultdict(int)
    for acc in academies:
        plan_counts[acc.get("plan_id") or "free"] += 1

    # City distribution
    city_counts: dict[str, int] = defaultdict(int)
    for acc in academies:
        city_counts[acc.get("city") or "Other"] += 1

    # Last 12 months labels
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    months = [
        (now - timedelta(days=30 * i)).strftime("%Y-%m")
        for i in range(11, -1, -1)
    ]

    # Cumulative growth (total academies up to each month)
    sorted_months = sorted(monthly_academies.keys())
    cumulative = 0
    cumulative_map: dict[str, int] = {}
    for m in sorted_months:
        cumulative += monthly_academies[m]
        cumulative_map[m] = cumulative

    # Fill forward for months with no new academies
    last = 0
    for m in months:
        if m in cumulative_map:
            last = cumulative_map[m]
        else:
            cumulative_map[m] = last

    growth_data = [
        {"month": m, "new": monthly_academies.get(m, 0), "total": cumulative_map.get(m, 0)}
        for m in months
    ]
    revenue_data = [
        {"month": m, "revenue": round(monthly_revenue.get(m, 0), 2)}
        for m in months
    ]

    current_mrr = sum(
        PLAN_PRICES.get(acc.get("plan_id", "free"), 0)
        for acc in academies
        if acc.get("status") != "suspended"
    )

    return {
        "monthly_growth": growth_data,
        "monthly_revenue": revenue_data,
        "plan_distribution": [
            {"plan": k, "count": v, "price": PLAN_PRICES.get(k, 0)}
            for k, v in plan_counts.items()
        ],
        "city_distribution": [
            {"city": k, "count": v}
            for k, v in sorted(city_counts.items(), key=lambda x: -x[1])
        ],
        "current_mrr": current_mrr,
        "total_academies": len(academies),
        "active_academies": len([a for a in academies if a.get("status") != "suspended"]),
        "suspended_academies": len([a for a in academies if a.get("status") == "suspended"]),
        "churn_rate": round(
            len([a for a in academies if a.get("status") == "suspended"]) / len(academies) * 100
            if academies else 0,
            1
        ),
        "arpu": round(
            current_mrr / len([a for a in academies if a.get("status") != "suspended"])
            if any(a.get("status") != "suspended" for a in academies) else 0,
            0
        ),
    }


# ── Renewal Reminders ──

def _next_renewal_date(billing_start_str: str):
    """Return the next monthly renewal date after today."""
    import calendar
    from datetime import date
    try:
        start = datetime.fromisoformat(billing_start_str.replace("Z", "+00:00")).date()
    except Exception:
        return None
    today = date.today()
    year, month, day = start.year, start.month, start.day
    while True:
        month += 1
        if month > 12:
            month = 1
            year += 1
        max_day = calendar.monthrange(year, month)[1]
        candidate = date(year, month, min(day, max_day))
        if candidate > today:
            return candidate

PLAN_PRICES = {"free": 0, "pro": 499, "enterprise": 999}

@router.post("/renewals/trigger")
async def trigger_renewal_reminders(req: RenewalReminderRequest):
    """
    Check all paid active academies and send renewal reminders to those
    whose subscription renews within `days_ahead` days.
    """
    from datetime import date
    import asyncio
    today = date.today()

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(
            f"{supabase.url}/rest/v1/academies?select=id,name,plan_id,billing_cycle_start,status&status=neq.suspended",
            headers=supabase.admin_headers
        )
        academies = res.json() if res.status_code == 200 else []

    due_soon = []
    for acc in academies:
        if acc.get("plan_id", "free") == "free":
            continue
        billing_start = acc.get("billing_cycle_start")
        if not billing_start:
            continue
        renewal = _next_renewal_date(billing_start)
        if renewal is None:
            continue
        days_until = (renewal - today).days
        if 0 <= days_until <= req.days_ahead:
            due_soon.append({
                "id": acc["id"],
                "name": acc["name"],
                "plan_id": acc.get("plan_id", "free"),
                "renewal_date": renewal.isoformat(),
                "days_until": days_until,
            })

    sent = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Fetch admin user_ids in parallel
        admin_responses = await asyncio.gather(*[
            client.get(
                f"{supabase.url}/rest/v1/admins?academy_id=eq.{acc['id']}&select=user_id&limit=1",
                headers=supabase.admin_headers
            )
            for acc in due_soon
        ], return_exceptions=True)

        for i, acc in enumerate(due_soon):
            price = PLAN_PRICES.get(acc["plan_id"], 0)
            days_label = "today" if acc["days_until"] == 0 else f"in {acc['days_until']} day(s)"
            notif_data = {
                "title": f"⏰ Renewal Reminder — {acc['name']}",
                "message": (
                    f"Your {acc['plan_id'].capitalize()} plan renews {days_label} "
                    f"({acc['renewal_date']}, {price} MAD). "
                    "Please ensure your payment is ready to avoid service interruption."
                ),
                "type": "renewal_reminder",
                "target_role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            ar = admin_responses[i]
            if not isinstance(ar, Exception) and ar.status_code == 200 and ar.json():
                notif_data["user_id"] = ar.json()[0]["user_id"]

            try:
                await client.post(
                    f"{supabase.url}/rest/v1/notifications",
                    json=notif_data,
                    headers=supabase.admin_headers
                )
                sent.append(acc)
            except Exception as e:
                logger.warning("Failed to send renewal reminder for %s: %s", acc["name"], e)

    return {
        "success": True,
        "checked": len(academies),
        "due_soon": len(due_soon),
        "reminders_sent": len(sent),
        "days_ahead": req.days_ahead,
        "academies": sent,
    }


# ── SaaS Settings ──

DEFAULT_SETTINGS = {
    "platform_name": "Academy SaaS Platform",
    "support_email": "support@academy.com",
    "default_trial_days": 14,
    "max_players_starter": 50,
    "max_players_pro": 200,
    "max_coaches_starter": 2,
    "max_coaches_pro": 10,
    "auto_provision": True,
    "email_notifications": True,
    "auto_backup": True,
    "maintenance_mode": False,
    "paypal_sandbox": True,
}

@router.get("/settings")
async def get_saas_settings():
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(
                f"{supabase.url}/rest/v1/saas_settings?select=*&limit=1",
                headers=supabase.admin_headers
            )
            if res.status_code == 200:
                data = res.json()
                if data:
                    row = data[0]
                    row.pop("id", None)
                    row.pop("created_at", None)
                    row.pop("updated_at", None)
                    return row
        return DEFAULT_SETTINGS
    except Exception as e:
        logger.error("Failed to fetch SaaS settings: %s", e, exc_info=True)
        return DEFAULT_SETTINGS


@router.put("/settings")
async def update_saas_settings(request: dict):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            check = await client.get(
                f"{supabase.url}/rest/v1/saas_settings?select=id&limit=1",
                headers=supabase.admin_headers
            )
            existing = check.json() if check.status_code == 200 else []
            if existing:
                res = await client.patch(
                    f"{supabase.url}/rest/v1/saas_settings?id=eq.{existing[0]['id']}",
                    json=request, headers=supabase.admin_headers
                )
            else:
                res = await client.post(
                    f"{supabase.url}/rest/v1/saas_settings",
                    json=request, headers=supabase.admin_headers
                )
            res.raise_for_status()
            return {"success": True}
    except Exception as e:
        logger.error("Failed to save settings: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ── Email System ──

EMAIL_TEMPLATES = {
    "welcome": {
        "name": "Welcome Email",
        "subject": "Welcome to Academy SaaS Platform! 🎉",
        "body": "Dear {academy_name},\n\nWelcome to the Academy SaaS Platform! Your academy has been successfully provisioned.\n\n• Admin Login: {login_url}\n• Plan: {plan}\n• Support: support@academy.com\n\nBest regards,\nAcademy SaaS Team",
        "variables": ["academy_name", "login_url", "plan"],
    },
    "payment_receipt": {
        "name": "Payment Receipt",
        "subject": "Payment Confirmation — {amount} MAD",
        "body": "Dear {academy_name},\n\nWe confirm receipt of your payment:\n\n• Amount: {amount} MAD\n• Plan: {plan}\n• Date: {date}\n• Transaction ID: {transaction_id}\n\nThank you for your continued trust.\n\nBest regards,\nAcademy SaaS Team",
        "variables": ["academy_name", "amount", "plan", "date", "transaction_id"],
    },
    "renewal_reminder": {
        "name": "Renewal Reminder",
        "subject": "⏰ Subscription Renewal Reminder — {academy_name}",
        "body": "Dear {academy_name},\n\nYour {plan} subscription is due for renewal on {renewal_date}.\n\nPlease ensure your payment method is up to date to avoid any service interruption.\n\n• Current Plan: {plan}\n• Renewal Date: {renewal_date}\n• Amount: {amount} MAD\n\nBest regards,\nAcademy SaaS Team",
        "variables": ["academy_name", "plan", "renewal_date", "amount"],
    },
    "suspension_notice": {
        "name": "Suspension Notice",
        "subject": "⚠️ Academy Suspended — {academy_name}",
        "body": "Dear {academy_name},\n\nYour academy has been suspended due to {reason}.\n\nTo reactivate your academy, please contact support or update your payment.\n\n• Status: Suspended\n• Reason: {reason}\n• Support: support@academy.com\n\nBest regards,\nAcademy SaaS Team",
        "variables": ["academy_name", "reason"],
    },
    "custom": {
        "name": "Custom Email",
        "subject": "{subject}",
        "body": "{body}",
        "variables": ["subject", "body"],
    },
}


class EmailSendRequest(BaseModel):
    template: str
    academy_ids: list[str]
    variables: dict = {}
    custom_subject: str | None = None
    custom_body: str | None = None


@router.get("/emails/templates")
def get_email_templates():
    """Get all available email templates."""
    return [
        {"id": k, "name": v["name"], "subject": v["subject"], "variables": v["variables"]}
        for k, v in EMAIL_TEMPLATES.items()
    ]


@router.post("/emails/send")
async def send_email(req: EmailSendRequest):
    """
    Send email to selected academies.
    For now, records as notifications (actual SMTP integration can be added later).
    """
    template = EMAIL_TEMPLATES.get(req.template)
    if not template:
        raise HTTPException(status_code=400, detail="Invalid template.")

    if not req.academy_ids:
        raise HTTPException(status_code=400, detail="No academies selected.")

    import asyncio

    # Fetch academy details + admin user IDs
    async with httpx.AsyncClient(timeout=30.0) as client:
        responses = await asyncio.gather(*[
            client.get(
                f"{supabase.url}/rest/v1/academies?id=eq.{aid}&select=id,name,plan_id",
                headers=supabase.admin_headers
            )
            for aid in req.academy_ids
        ], return_exceptions=True)

        admin_res = await asyncio.gather(*[
            client.get(
                f"{supabase.url}/rest/v1/admins?academy_id=eq.{aid}&select=user_id,email&limit=1",
                headers=supabase.admin_headers
            )
            for aid in req.academy_ids
        ], return_exceptions=True)

    sent = []
    failed = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for i, aid in enumerate(req.academy_ids):
            try:
                academy_data = responses[i].json()[0] if not isinstance(responses[i], Exception) and responses[i].status_code == 200 and responses[i].json() else {}
                admin_data = admin_res[i].json()[0] if not isinstance(admin_res[i], Exception) and admin_res[i].status_code == 200 and admin_res[i].json() else {}

                # Build variables
                variables = {
                    "academy_name": academy_data.get("name", "Academy"),
                    "plan": academy_data.get("plan_id", "free"),
                    "login_url": "https://academy.com/login",
                    "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    **req.variables,
                }

                if req.template == "custom":
                    subject = req.custom_subject or "Message from Academy SaaS"
                    body = req.custom_body or ""
                else:
                    subject = template["subject"]
                    body = template["body"]
                    for k, v in variables.items():
                        subject = subject.replace(f"{{{k}}}", str(v))
                        body = body.replace(f"{{{k}}}", str(v))

                # Store as notification (+ would send via SMTP if configured)
                notif_data = {
                    "title": f"📧 {subject}",
                    "message": body[:500],
                    "type": "email",
                    "target_role": "admin",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                if admin_data.get("user_id"):
                    notif_data["user_id"] = admin_data["user_id"]

                await client.post(
                    f"{supabase.url}/rest/v1/notifications",
                    json=notif_data,
                    headers=supabase.admin_headers
                )
                sent.append({
                    "academy": academy_data.get("name", aid),
                    "email": admin_data.get("email", "—"),
                })
            except Exception as e:
                failed.append({"academy_id": aid, "error": str(e)})

    return {
        "success": True,
        "sent": len(sent),
        "failed": len(failed),
        "details": sent,
        "errors": failed,
    }


# ── Invoice Generation ──

from fastapi.responses import HTMLResponse


@router.get("/invoices/{academy_id}/{payment_id}", response_class=HTMLResponse)
async def generate_invoice(academy_id: str, payment_id: str):
    """Generate a printable HTML invoice for a specific payment."""
    import asyncio

    async with httpx.AsyncClient(timeout=30.0) as client:
        academy_req, payment_req = await asyncio.gather(
            client.get(
                f"{supabase.url}/rest/v1/academies?id=eq.{academy_id}&select=*",
                headers=supabase.admin_headers
            ),
            client.get(
                f"{supabase.url}/rest/v1/payments_gateway?id=eq.{payment_id}&select=*",
                headers=supabase.admin_headers
            ),
            return_exceptions=True,
        )

    academy = academy_req.json()[0] if not isinstance(academy_req, Exception) and academy_req.status_code == 200 and academy_req.json() else None
    payment = payment_req.json()[0] if not isinstance(payment_req, Exception) and payment_req.status_code == 200 and payment_req.json() else None

    if not academy:
        raise HTTPException(status_code=404, detail="Academy not found.")
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found.")

    inv_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    pay_date = payment.get("created_at", "")[:10] if payment.get("created_at") else inv_date
    inv_number = f"INV-{pay_date.replace('-', '')}-{payment_id[:6].upper()}"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice {inv_number}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f8f9fb; color: #1e293b; }}
  .invoice {{ max-width: 800px; margin: 40px auto; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }}
  .header {{ background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 40px; }}
  .header h1 {{ font-size: 28px; font-weight: 900; margin-bottom: 4px; }}
  .header p {{ font-size: 13px; opacity: 0.8; }}
  .body {{ padding: 40px; }}
  .meta {{ display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }}
  .meta-block h3 {{ font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 8px; font-weight: 700; }}
  .meta-block p {{ font-size: 14px; color: #334155; line-height: 1.7; }}
  .meta-block p strong {{ color: #0f172a; }}
  table {{ width: 100%; border-collapse: collapse; margin-bottom: 32px; }}
  th {{ text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; padding: 12px 16px; border-bottom: 2px solid #e2e8f0; }}
  td {{ padding: 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }}
  .total-row td {{ border-bottom: none; padding-top: 20px; }}
  .total-row td:last-child {{ font-size: 22px; font-weight: 900; color: #6366f1; }}
  .footer {{ text-align: center; padding: 24px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; }}
  .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }}
  .badge-paid {{ background: #ecfdf5; color: #059669; }}
  .badge-pending {{ background: #fffbeb; color: #d97706; }}
  @media print {{
    body {{ background: white; }}
    .invoice {{ box-shadow: none; margin: 0; border-radius: 0; }}
    .no-print {{ display: none !important; }}
  }}
</style>
</head>
<body>
<div class="no-print" style="text-align:center;padding:16px;">
  <button onclick="window.print()" style="padding:10px 28px;background:#6366f1;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;">
    🖨️ Print / Save as PDF
  </button>
</div>
<div class="invoice">
  <div class="header">
    <h1>INVOICE</h1>
    <p>{inv_number}</p>
  </div>
  <div class="body">
    <div class="meta">
      <div class="meta-block">
        <h3>Billed To</h3>
        <p><strong>{academy.get('name', 'Academy')}</strong><br>
        {academy.get('city', '')}<br>
        {academy.get('subdomain', '')}.academy.com</p>
      </div>
      <div class="meta-block" style="text-align:right;">
        <h3>Invoice Details</h3>
        <p><strong>Invoice #:</strong> {inv_number}<br>
        <strong>Date:</strong> {pay_date}<br>
        <strong>Status:</strong> <span class="badge {'badge-paid' if payment.get('status') == 'completed' else 'badge-pending'}">{(payment.get('status', 'pending')).upper()}</span></p>
      </div>
    </div>
    <table>
      <thead>
        <tr><th>Description</th><th>Plan</th><th style="text-align:right;">Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>{payment.get('description', 'Subscription Payment')}</td>
          <td>{academy.get('plan_id', 'pro').upper()}</td>
          <td style="text-align:right;font-weight:700;">{payment.get('amount', 0)} {payment.get('currency', 'MAD')}</td>
        </tr>
        <tr class="total-row">
          <td></td>
          <td style="font-weight:700;color:#64748b;">TOTAL</td>
          <td style="text-align:right;">{payment.get('amount', 0)} {payment.get('currency', 'MAD')}</td>
        </tr>
      </tbody>
    </table>
    {f'<p style="font-size:12px;color:#94a3b8;">Transaction ID: {payment.get("paypal_order_id", "—")}</p>' if payment.get('paypal_order_id') else ''}
  </div>
  <div class="footer">
    Academy SaaS Platform &mdash; support@academy.com<br>
    This is a computer-generated invoice.
  </div>
</div>
</body></html>"""

    return HTMLResponse(content=html)


# ── Login As (Impersonation) ──

from core.config import settings as app_settings


@router.post("/impersonate/{academy_id}")
async def impersonate_academy(academy_id: str):
    """
    Generate an impersonation session for an academy's primary admin.
    Uses Supabase Admin API to generate a magic link or return user credentials.
    """
    # 1. Find the primary admin for this academy
    async with httpx.AsyncClient(timeout=30.0) as client:
        admin_res = await client.get(
            f"{supabase.url}/rest/v1/admins?academy_id=eq.{academy_id}&select=user_id,email,full_name&limit=1",
            headers=supabase.admin_headers
        )

    if admin_res.status_code != 200 or not admin_res.json():
        raise HTTPException(status_code=404, detail="No admin found for this academy.")

    admin = admin_res.json()[0]
    user_id = admin.get("user_id")
    email = admin.get("email")

    if not user_id:
        raise HTTPException(status_code=400, detail="Admin has no linked user ID.")

    # 2. Use Supabase Admin API to generate a magic link (or use generateLink)
    service_key = app_settings.SUPABASE_SERVICE_ROLE_KEY or app_settings.SUPABASE_KEY

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Generate a magic link via Supabase Admin
        link_res = await client.post(
            f"{supabase.url}/auth/v1/admin/generate_link",
            json={
                "type": "magiclink",
                "email": email,
                "options": {
                    "redirect_to": f"{app_settings.FRONTEND_URL}/admin"
                }
            },
            headers={
                "apikey": app_settings.SUPABASE_KEY,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json",
            }
        )

    if link_res.status_code >= 400:
        # Fallback: just return admin info for manual login
        return {
            "success": True,
            "method": "manual",
            "admin": {
                "email": email,
                "full_name": admin.get("full_name", ""),
                "user_id": user_id,
            },
            "message": "Magic link generation unavailable. Use the admin credentials to login manually.",
        }

    link_data = link_res.json()

    return {
        "success": True,
        "method": "magic_link",
        "admin": {
            "email": email,
            "full_name": admin.get("full_name", ""),
        },
        "action_link": link_data.get("action_link", ""),
        "redirect_url": f"{app_settings.FRONTEND_URL}/admin",
    }

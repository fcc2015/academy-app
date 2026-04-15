from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
import httpx
from datetime import datetime, timezone
from core.auth_middleware import require_role
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

class DomainAssignment(BaseModel):
    custom_domain: str

class PlanAssignment(BaseModel):
    plan_id: str
    pro_rata_amount: float | None = None
    pro_rata_credit: float | None = None
    upgrade_type: str | None = None  # "upgrade"

class NotificationTriggerRequest(BaseModel):
    thresholds: list[int] = [50, 75, 90, 100]

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
    """Provision a new client academy and its root admin."""
    existing_name = await supabase._get(f"/rest/v1/academies?name=eq.{quote(req.name)}&select=id")
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An academy with this name already exists. | واحد الأكاديمية بهاد الاسم ديجا كاينة: {req.name}"
        )
    existing_email = await supabase._get(f"/rest/v1/admins?email=eq.{quote(str(req.admin_email))}&select=id")
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This email is already used by another admin. | هاد الإيميل ديجا مستعمل من طرف أدمين آخر: {req.admin_email}"
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
    try:
        res_academy = await supabase._post("/rest/v1/academies?select=id", academy_data)
    except Exception as e:
        if "duplicate" in str(e).lower() or "23505" in str(e):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                detail=f"An academy with this name already exists.")
        raise

    academy_row = res_academy[0] if isinstance(res_academy, list) else res_academy
    new_academy_id = academy_row["id"]

    try:
        auth_res = await supabase.admin_create_user(
            email=req.admin_email,
            password=req.admin_password,
            role="admin",
            full_name=req.admin_name,
            academy_id=new_academy_id
        )
        admin_user_id = auth_res.get("id")
        try:
            await supabase._post("/rest/v1/users", {
                "id": admin_user_id, "full_name": req.admin_name,
                "role": "admin", "academy_id": new_academy_id
            })
        except Exception as e:
            print(f"Users record (non-critical): {e}")
        await supabase._post("/rest/v1/admins", {
            "user_id": admin_user_id, "email": req.admin_email,
            "full_name": req.admin_name, "status": "active", "academy_id": new_academy_id
        })
        return {"success": True, "academy": academy_row, "admin_user_id": admin_user_id}
    except Exception as e:
        error_msg = str(e)
        if "duplicate" in error_msg.lower() or "23505" in error_msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                detail=f"This email already exists: {req.admin_email}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Academy created, but failed to provision admin: {error_msg}")


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
    except Exception:
        pass
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
                print(f"Payment record (non-critical): {e}")

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
    except Exception:
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
                print(f"Notification send failed for {acc['name']}: {e}")

    return {
        "success": True,
        "notifications_sent": len(sent),
        "details": sent,
        "skipped": skipped,
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
    except Exception:
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
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")

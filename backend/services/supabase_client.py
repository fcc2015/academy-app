import httpx
import asyncio
import logging
from datetime import datetime, timezone
from core.config import settings
from core.context import academy_id_ctx

logger = logging.getLogger("supabase")

# Retry config for transient failures
_MAX_RETRIES = 3
_RETRY_BACKOFF = 0.5  # seconds, doubles each retry
_RETRYABLE_STATUS = {502, 503, 504}

class InjectClient:
    def __init__(self, client, base_url=""):
        self.client = client
        self.base_url = base_url

    def _resolve(self, url):
        """Ensure URL is absolute by prepending base_url if needed."""
        url_str = str(url)
        if not url_str.startswith("http"):
            return f"{self.base_url}{url_str}"
        return url_str

    def _inject(self, url):
        from core.context import academy_id_ctx
        academy_id = academy_id_ctx.get(None)
        url_str = self._resolve(url)
        if not academy_id or "/rpc/" in url_str or "/auth/v1/" in url_str or "/storage/v1/" in url_str:
            return url_str
        separator = "&" if "?" in url_str else "?"
        return f"{url_str}{separator}academy_id=eq.{academy_id}"

    async def get(self, url, **kwargs):
        return await self.client.get(self._inject(url), **kwargs)

    async def delete(self, url, **kwargs):
        return await self.client.delete(self._inject(url), **kwargs)

    async def patch(self, url, **kwargs):
        import copy
        json_data = kwargs.get("json")
        from core.context import academy_id_ctx
        academy_id = academy_id_ctx.get(None)
        if academy_id and json_data and isinstance(json_data, dict) and "academy_id" not in json_data:
            kwargs["json"] = copy.deepcopy(json_data)
            kwargs["json"]["academy_id"] = academy_id
        return await self.client.patch(self._inject(url), **kwargs)

    async def post(self, url, **kwargs):
        from core.context import academy_id_ctx
        import copy
        academy_id = academy_id_ctx.get(None)
        url_str = self._resolve(url)
        if academy_id and "/rpc/" not in url_str and "/auth/v1/" not in url_str and "/storage/v1/" not in url_str:
            data = kwargs.get("json")
            if isinstance(data, dict) and "academy_id" not in data:
                kwargs["json"] = copy.deepcopy(data)
                kwargs["json"]["academy_id"] = academy_id
            elif isinstance(data, list):
                new_data = copy.deepcopy(data)
                for item in new_data:
                    if isinstance(item, dict) and "academy_id" not in item:
                        item["academy_id"] = academy_id
                kwargs["json"] = new_data
        # Note: we do NOT inject academy_id in the URL query string for POST
        return await self.client.post(url_str, **kwargs)

class SupabaseHttpClient:
    """Async HTTP client for Supabase"""
    def __init__(self, url: str, key: str, service_role_key: str = None):
        self.url = url
        self.key = key
        self.service_role_key = service_role_key
        # Use service_role key for all backend operations — our own auth middleware
        # handles authorization, so RLS at the DB level is bypassed intentionally.
        _effective_key = self.service_role_key or self.key
        self.headers = {
            "apikey": _effective_key,
            "Authorization": f"Bearer {_effective_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        # Admin headers (kept for backward compatibility, same as headers now)
        self.admin_headers = {
            "apikey": self.service_role_key or self.key,
            "Authorization": f"Bearer {self.service_role_key or self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        self.client = InjectClient(httpx.AsyncClient(timeout=30.0, headers=self.headers), base_url=self.url)
        # Startup log — confirm which key is in use
        _key_type = "service_role" if self.service_role_key else "anon"
        _key_preview = _effective_key[:15] + "..."
        logger.info(f"SupabaseHttpClient initialized with {_key_type} key ({_key_preview})")

    async def _get(self, endpoint: str):
        """GET with automatic retry on transient failures."""
        url = f"{self.url}{endpoint}"
        last_exc = None
        for attempt in range(_MAX_RETRIES):
            try:
                res = await self.client.get(url)
                if res.status_code in _RETRYABLE_STATUS and attempt < _MAX_RETRIES - 1:
                    logger.warning("Retryable %d on GET %s (attempt %d)", res.status_code, endpoint[:80], attempt + 1)
                    await asyncio.sleep(_RETRY_BACKOFF * (2 ** attempt))
                    continue
                res.raise_for_status()
                return res.json()
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout) as e:
                last_exc = e
                if attempt < _MAX_RETRIES - 1:
                    logger.warning("Network error on GET %s (attempt %d): %s", endpoint[:80], attempt + 1, type(e).__name__)
                    await asyncio.sleep(_RETRY_BACKOFF * (2 ** attempt))
                    continue
                raise
        raise last_exc  # Should not reach here

    async def _post(self, endpoint: str, data: dict, headers: dict = None):
        """POST with automatic retry on transient failures."""
        h = {**self.headers, **(headers or {})}
        url = f"{self.url}{endpoint}"
        last_exc = None
        for attempt in range(_MAX_RETRIES):
            try:
                res = await self.client.post(url, json=data, headers=h)
                if res.status_code in _RETRYABLE_STATUS and attempt < _MAX_RETRIES - 1:
                    logger.warning("Retryable %d on POST %s (attempt %d)", res.status_code, endpoint[:80], attempt + 1)
                    await asyncio.sleep(_RETRY_BACKOFF * (2 ** attempt))
                    continue
                res.raise_for_status()
                return res.json()
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout) as e:
                last_exc = e
                if attempt < _MAX_RETRIES - 1:
                    logger.warning("Network error on POST %s (attempt %d): %s", endpoint[:80], attempt + 1, type(e).__name__)
                    await asyncio.sleep(_RETRY_BACKOFF * (2 ** attempt))
                    continue
                raise
        raise last_exc  # Should not reach here

        
    async def sign_in_with_password(self, email, password):
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{self.url}/auth/v1/token?grant_type=password",
                json={"email": email, "password": password},
                headers=self.headers
            )
            res.raise_for_status()
            return res.json()
        
    async def sign_up(self, email, password, data=None):
        payload = {"email": email, "password": password}
        if data:
            payload["data"] = data
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{self.url}/auth/v1/signup",
                json=payload,
                headers=self.headers
            )
            res.raise_for_status()
            return res.json()

    async def admin_create_user(self, email, password, role="admin", full_name=None, academy_id=None):
        """Use the Supabase Auth Admin API to create a user server-side (requires service_role key)"""
        user_metadata = {"role": role, "is_academy_owner": True}
        if full_name:
            user_metadata["full_name"] = full_name
        if academy_id:
            user_metadata["academy_id"] = academy_id

        payload = {
            "email": email,
            "password": password,
            "email_confirm": True,  # Bypass email verification
            "user_metadata": user_metadata
        }
        # Must use admin (service_role) headers for /auth/v1/admin/* endpoints
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{self.url}/auth/v1/admin/users",
                json=payload,
                headers=self.admin_headers
            )
            if not res.is_success:
                try:
                    body = res.json()
                    msg = body.get("msg", body.get("message", body.get("error", res.text)))
                except Exception:
                    msg = res.text
                raise Exception(f"Supabase auth error {res.status_code}: {msg}")
            return res.json()

    async def get_players(self):
        return await self._get("/rest/v1/players?select=*&order=created_at.desc")

    # New method to fetch child directly
    async def get_player_by_user_id(self, user_id: str):
        url = f"/rest/v1/players?or=(user_id.eq.{user_id},parent_id.eq.{user_id})&select=*,users(full_name)&limit=1"
        data = await self._get(url)
        return data[0] if data else None

    async def insert_user(self, user_data):
        """Insert into users table using admin headers to bypass RLS."""
        # Auto-inject academy_id from context (since we bypass InjectClient)
        from core.context import academy_id_ctx
        academy_id = academy_id_ctx.get(None)
        if academy_id and "academy_id" not in user_data:
            user_data = {**user_data, "academy_id": academy_id}
        url = f"{self.url}/rest/v1/users"
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                url,
                json=user_data,
                headers={**self.admin_headers, "Prefer": "return=representation"}
            )
            res.raise_for_status()
            return res.json()

    async def update_user(self, user_id: str, user_data: dict):
        res = await self.client.patch(f"{self.url}/rest/v1/users?id=eq.{user_id}", json=user_data)
        res.raise_for_status()
        return res.json()

    async def insert_player(self, player_data):
        return await self._post("/rest/v1/players", player_data)

    async def delete_player(self, user_id):
        res = await self.client.delete(f"{self.url}/rest/v1/players?user_id=eq.{user_id}")
        res.raise_for_status()
        return {"success": True}

    async def update_player(self, user_id, player_data):
        res = await self.client.patch(f"/rest/v1/players?user_id=eq.{user_id}", json=player_data)
        res.raise_for_status()
        return res.json()

    async def get_payments(self):
        return await self._get("/rest/v1/payments?select=*,users(full_name)&order=created_at.desc")

    async def insert_payment(self, payment_data):
        return await self._post("/rest/v1/payments", payment_data)

    async def update_payment(self, payment_id: str, payment_data: dict):
        res = await self.client.patch(f"/rest/v1/payments?id=eq.{payment_id}", json=payment_data)
        res.raise_for_status()
        return res.json()

    async def delete_payment(self, payment_id: str):
        res = await self.client.delete(f"/rest/v1/payments?id=eq.{payment_id}")
        if res.status_code not in [200, 201, 204]:
            res.raise_for_status()
        return {"success": True}

    async def get_coaches(self):
        return await self._get("/rest/v1/coaches?select=*")

    async def insert_coach(self, coach_data):
        return await self._post("/rest/v1/coaches", coach_data)

    async def delete_coach(self, coach_id):
        res = await self.client.delete(f"/rest/v1/coaches?id=eq.{coach_id}")
        res.raise_for_status()
        return res.status_code == 204

    async def get_events(self):
        return await self._get("/rest/v1/events?select=*&order=event_date.asc,event_time.asc")

    async def insert_event(self, event_data):
        return await self._post("/rest/v1/events", event_data)

    async def update_event(self, event_id, event_data):
        res = await self.client.patch(f"/rest/v1/events?id=eq.{event_id}", json=event_data)
        res.raise_for_status()
        return res.json()

    async def delete_event(self, event_id):
        res = await self.client.delete(f"/rest/v1/events?id=eq.{event_id}")
        res.raise_for_status()
        return res.status_code == 204

    async def get_dashboard_stats(self):
        # Parallel fetching using persistent client
        tasks = [
            self.client.get(f"{self.url}/rest/v1/players?select=id"),
            self.client.get(f"{self.url}/rest/v1/payments?select=amount"),
            self.client.get(f"{self.url}/rest/v1/coaches?select=id&status=eq.Active"),
            self.client.get(f"{self.url}/rest/v1/events?select=id&status=eq.Scheduled")
        ]
        responses = await asyncio.gather(*tasks)
        
        total_players = len(responses[0].json()) if responses[0].status_code == 200 else 0
        payments_data = responses[1].json() if responses[1].status_code == 200 else []
        total_revenue = sum(p.get('amount', 0) for p in payments_data)
        active_coaches = len(responses[2].json()) if responses[2].status_code == 200 else 0
        upcoming_events = len(responses[3].json()) if responses[3].status_code == 200 else 0

        return {
            "total_players": total_players,
            "total_revenue": total_revenue,
            "active_coaches": active_coaches,
            "upcoming_events": upcoming_events
        }

    async def get_recent_activity(self):
        tasks = [
            self.client.get(f"{self.url}/rest/v1/players?select=full_name,category,created_at&order=created_at.desc&limit=3"),
            self.client.get(f"{self.url}/rest/v1/payments?select=amount,users(full_name),created_at&order=created_at.desc&limit=3"),
            self.client.get(f"{self.url}/rest/v1/events?select=title,event_date,created_at&order=created_at.desc&limit=3")
        ]
        responses = await asyncio.gather(*tasks)
        
        players = responses[0].json() if responses[0].status_code == 200 else []
        for p in players: p['type'] = 'registration'

        payments = responses[1].json() if responses[1].status_code == 200 else []
        for p in payments: 
            p['type'] = 'payment'
            p['name'] = p.get('users', {}).get('full_name', 'Unknown Player')

        events = responses[2].json() if responses[2].status_code == 200 else []
        for e in events: e['type'] = 'event'

        combined = players + payments + events
        combined.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return combined[:10]

    async def get_academy_settings(self):
        data = await self._get("/rest/v1/academy_settings?select=*")
        return data[0] if data else None

    async def update_academy_settings(self, settings_id, settings_data):
        res = await self.client.patch(f"{self.url}/rest/v1/academy_settings?id=eq.{settings_id}", json=settings_data)
        res.raise_for_status()
        return res.json()

    # Squads Management
    async def get_squads(self):
        return await self._get("/rest/v1/squads?select=*,coaches(full_name)")

    async def get_squads_for_coach(self, user_id: str):
        coaches = await self._get(f"/rest/v1/coaches?user_id=eq.{user_id}&select=id")
        if not coaches:
            return []
        coach_id = coaches[0].get('id')
        return await self._get(f"/rest/v1/squads?coach_id=eq.{coach_id}&select=*,coaches(full_name)")

    async def insert_squad(self, squad_data: dict):
        return await self._post("/rest/v1/squads", squad_data)

    async def update_squad(self, squad_id: str, squad_data: dict):
        res = await self.client.patch(f"{self.url}/rest/v1/squads?id=eq.{squad_id}", json=squad_data)
        res.raise_for_status()
        return res.json()

    async def delete_squad(self, squad_id: str):
        res = await self.client.delete(f"{self.url}/rest/v1/squads?id=eq.{squad_id}")
        if res.status_code not in [200, 201, 204]:
            res.raise_for_status()
        return {"success": True}

    async def update_squad_roster(self, squad_id: str, player_ids: list[str]):
        # 1. Remove all players currently in this squad (unassign them)
        await self.client.patch(
            f"/rest/v1/players?squad_id=eq.{squad_id}",
            json={"squad_id": None}
        )
        
        # 2. Assign the new list of players to this squad
        if player_ids:
            ids_str = ",".join(player_ids)
            await self.client.patch(
                f"/rest/v1/players?user_id=in.({ids_str})",
                json={"squad_id": squad_id}
            )
            
        return {"success": True, "message": f"Assigned {len(player_ids)} players to squad {squad_id}"}

    # Attendance Management
    async def get_attendance(self, squad_id: str, date: str):
        url = f"/rest/v1/attendance?squad_id=eq.{squad_id}&date=eq.{date}&select=*,players(users(full_name))"
        return await self._get(url)

    async def get_player_attendance(self, player_id: str):
        url = f"/rest/v1/attendance?player_id=eq.{player_id}&select=*,squads(name)"
        return await self._get(url)

    async def upsert_attendance(self, records: list):
        # We use standard POST to Supabase REST and specify on_conflict
        headers = {"Prefer": "resolution=merge-duplicates"}
        return await self._post("/rest/v1/attendance", records, headers=headers)

    # Notifications Management
    async def get_notifications(self, user_id: str = None, role: str = None):
        url = "/rest/v1/notifications?select=*&order=created_at.desc"
        or_conditions = []
        if user_id:
            or_conditions.append(f"user_id.eq.{user_id}")
        if role:
            capitalized_role = role.capitalize()
            or_conditions.append(f"and(target_role.eq.{capitalized_role},user_id.is.null)")
        or_conditions.append("and(target_role.is.null,user_id.is.null)")
        if or_conditions:
            url += f"&or=({','.join(or_conditions)})"
        return await self._get(url)

    async def insert_notification(self, data: dict):
        return await self._post("/rest/v1/notifications", data)

    async def mark_notification_read(self, notification_id: str):
        res = await self.client.patch(f"/rest/v1/notifications?id=eq.{notification_id}", json={"is_read": True})
        res.raise_for_status()
        return res.json()

    async def delete_notification(self, notification_id: str):
        res = await self.client.delete(f"/rest/v1/notifications?id=eq.{notification_id}")
        if res.status_code not in [200, 201, 204]:
            res.raise_for_status()
        return {"success": True}

    # Public Requests
    async def insert_public_request(self, data: dict):
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{self.url}/rest/v1/public_requests",
                json=data,
                headers={**self.admin_headers, "Prefer": "return=representation"}
            )
            res.raise_for_status()
            return res.json()

    async def get_public_requests(self, status: str = "new"):
        # If status is "active", fetch both 'new' and 'processing'
        if status == "active":
            url = f"/rest/v1/public_requests?select=*&status=in.(new,processing)&order=created_at.desc"
        else:
            url = f"/rest/v1/public_requests?select=*&status=eq.{status}&order=created_at.desc"
        return await self._get(url)

    async def update_public_request_status(self, request_id: str, new_status: str):
        res = await self.client.patch(f"/rest/v1/public_requests?id=eq.{request_id}", json={"status": new_status})
        res.raise_for_status()
        return res.json()


    # Evaluations Management
    async def get_evaluations(self, player_id: str = None, limit: int = 100, coach_id: str = None):
        url = f"/rest/v1/evaluations?select=*,players(users(full_name))&order=evaluation_date.desc&limit={limit}"
        if player_id:
            url += f"&player_id=eq.{player_id}"
        if coach_id:
            url += f"&coach_id=eq.{coach_id}"
            
        data = await self._get(url)
        
        # Calculate overall_rating if it's not present or needs to be calculated
        for ev in data:
            if 'overall_rating' not in ev or ev['overall_rating'] is None:
                scores = [
                    ev.get('technical_score', 0),
                    ev.get('tactical_score', 0),
                    ev.get('physical_score', 0),
                    ev.get('mental_score', 0)
                ]
                ev['overall_rating'] = sum(scores) / len(scores) if scores else 0
        
        return data


    async def insert_evaluation(self, data: dict):
        return await self._post("/rest/v1/evaluations", data)

    async def delete_evaluation(self, evaluation_id: str):
        res = await self.client.delete(f"/rest/v1/evaluations?id=eq.{evaluation_id}")
        if res.status_code not in [200, 201, 204]:
            res.raise_for_status()
        return {"success": True}

    # Matches Management
    async def get_matches(self):
        return await self._get("/rest/v1/matches?select=*,squads(name)")

    async def get_matches_by_coach(self, coach_id: str):
        return await self._get(f"/rest/v1/matches?coach_id=eq.{coach_id}&select=*,squads(name)")

    async def get_matches_by_player(self, user_id: str):
        # PostgREST cs operator allows jsonb array contains
        val = f'["{user_id}"]'
        return await self._get(f"/rest/v1/matches?convoked_players=cs.{val}&select=*,squads(name)")

    async def get_match_by_id(self, match_id: str):
        data = await self._get(f"/rest/v1/matches?id=eq.{match_id}&select=*,squads(name)")
        return data[0] if data else None

    async def insert_match(self, match_data: dict):
        if 'match_date' in match_data and hasattr(match_data['match_date'], 'isoformat'):
            match_data['match_date'] = match_data['match_date'].isoformat()
            
        # NOTE: match_date should already be serialized to ISO string by the router
        return await self._post("/rest/v1/matches", match_data)

    async def update_match(self, match_id: str, match_data: dict):
        if 'match_date' in match_data and hasattr(match_data['match_date'], 'isoformat'):
            match_data['match_date'] = match_data['match_date'].isoformat()
            
        res = await self.client.patch(f"/rest/v1/matches?id=eq.{match_id}&select=*", json=match_data)
        res.raise_for_status()
        return res.json()

    async def delete_match(self, match_id: str):
        res = await self.client.delete(f"/rest/v1/matches?id=eq.{match_id}")
        if res.status_code not in [200, 201, 204]:
            res.raise_for_status()
        return {"success": True}

    # Used internally
    async def _execute_rpc(self, function_name: str, payload: dict):
        res = await self.client.post(f"/rest/v1/rpc/{function_name}", json=payload)
        res.raise_for_status()
        return res.json()

    # Update Coach
    async def update_coach(self, coach_id: str, coach_data: dict):
        res = await self.client.patch(f"{self.url}/rest/v1/coaches?id=eq.{coach_id}", json=coach_data)
        res.raise_for_status()
        return res.json()

    # Delete Payment
    # This method was duplicated, keeping the first async version.

    # Coupons Management
    async def get_coupons(self):
        return await self._get("/rest/v1/coupons?select=*&order=created_at.desc")

    async def insert_coupon(self, data: dict):
        return await self._post("/rest/v1/coupons", data)

    async def get_coupon_by_code(self, code: str):
        data = await self._get(f"/rest/v1/coupons?select=*&code=eq.{code}")
        return data[0] if data else None

    async def update_coupon_status(self, coupon_id: str, is_active: bool):
        res = await self.client.patch(
            f"/rest/v1/coupons?id=eq.{coupon_id}",
            json={"is_active": is_active}
        )
        res.raise_for_status()
        return res.json()

    async def delete_coupon(self, coupon_id: str):
        res = await self.client.delete(f"/rest/v1/coupons?id=eq.{coupon_id}")
        if res.status_code not in [200, 201, 204]:
            res.raise_for_status()
        return {"success": True}

    # Subscription Plans Management
    async def get_plans(self, active_only: bool = False):
        url = "/rest/v1/subscription_plans?order=sort_order.asc"
        if active_only:
            url += "&is_active=eq.true"
        return await self._get(url)

    async def insert_plan(self, plan_data: dict):
        result = await self._post("/rest/v1/subscription_plans", plan_data)
        return result[0] if isinstance(result, list) and result else result

    async def update_plan(self, plan_id: str, plan_data: dict):
        res = await self.client.patch(
            f"/rest/v1/subscription_plans?id=eq.{plan_id}",
            json=plan_data
        )
        res.raise_for_status()
        result = res.json()
        return result[0] if isinstance(result, list) and result else result

    async def delete_plan(self, plan_id: str):
        res = await self.client.delete(f"/rest/v1/subscription_plans?id=eq.{plan_id}")
        if res.status_code not in [200, 201, 204]:
            res.raise_for_status()
        return {"success": True}

    # =========================================================
    # Subscriptions Management
    # =========================================================

    async def get_subscriptions(self):
        url = "/rest/v1/subscriptions?select=*,player_profiles(full_name,parent_name,parent_whatsapp)&order=next_due_date.asc"
        data = await self._get(url)
        # Normalize player data key
        for s in data:
            if 'player_profiles' in s:
                s['players'] = s.pop('player_profiles')
        return data

    async def get_subscription_by_player(self, player_id: str):
        url = f"/rest/v1/subscriptions?player_id=eq.{player_id}&select=*"
        data = await self._get(url)
        return data[0] if data else None

    async def insert_subscription(self, data: dict):
        result = await self._post("/rest/v1/subscriptions", data)
        return result[0] if isinstance(result, list) and result else result

    async def update_subscription(self, sub_id: str, data: dict):
        res = await self.client.patch(f"/rest/v1/subscriptions?id=eq.{sub_id}", json=data)
        res.raise_for_status()
        result = res.json()
        return result[0] if isinstance(result, list) and result else result

    async def update_subscription_alert_status(self, sub_id: str, alert_status: str):
        await self.client.patch(
            f"{self.url}/rest/v1/subscriptions?id=eq.{sub_id}",
            json={"alert_status": alert_status, "last_alert_sent_at": datetime.now(timezone.utc).isoformat()}
        )
        return {"success": True}

    async def delete_subscription(self, sub_id: str):
        res = await self.client.delete(f"/rest/v1/subscriptions?id=eq.{sub_id}")
        if res.status_code not in [200, 201, 204]:
            res.raise_for_status()
        return {"success": True}

    def get_next_invoice_sequence(self):
        """Return a pseudo-unique sequence number using timestamp milliseconds."""
        import time
        return int(time.time() * 10) % 100000  # 5-digit unique-ish number

    async def get_payments_by_player(self, player_id: str):
        return await self._get(f"/rest/v1/payments?player_id=eq.{player_id}&order=created_at.desc")

    # =========================================================
    # Admins Management
    # =========================================================

    async def get_admins(self):
        return await self._get("/rest/v1/admins?select=*")

    async def insert_admin(self, admin_data: dict):
        return await self._post("/rest/v1/admins", admin_data)

    async def update_admin(self, admin_id: str, admin_data: dict):
        res = await self.client.patch(f"/rest/v1/admins?id=eq.{admin_id}", json=admin_data)
        res.raise_for_status()
        return res.json()

    async def delete_admin(self, admin_id: str):
        res = await self.client.delete(f"/rest/v1/admins?id=eq.{admin_id}")
        res.raise_for_status()
        return res.status_code == 204

    # =========================================================
    # Expenses Management
    # =========================================================
    async def get_expenses(self):
        return await self._get("/rest/v1/expenses?select=*&order=expense_date.desc")

    async def insert_expense(self, data: dict):
        return await self._post("/rest/v1/expenses", data)

    async def update_expense(self, expense_id: str, data: dict):
        res = await self.client.patch(f"{self.url}/rest/v1/expenses?id=eq.{expense_id}", json=data)
        res.raise_for_status()
        result = res.json()
        return result[0] if isinstance(result, list) and result else result

    async def delete_expense(self, expense_id: str):
        res = await self.client.delete(f"/rest/v1/expenses?id=eq.{expense_id}")
        res.raise_for_status()
        return {"success": True}

    # =========================================================
    # Inventory Management
    # =========================================================
    async def get_inventory(self):
        return await self._get("/rest/v1/inventory?select=*&order=category.asc")

    async def insert_inventory_item(self, data: dict):
        return await self._post("/rest/v1/inventory", data)

    async def update_inventory_item(self, item_id: str, data: dict):
        res = await self.client.patch(f"/rest/v1/inventory?id=eq.{item_id}", json=data)
        res.raise_for_status()
        return res.json()

    async def delete_inventory_item(self, item_id: str):
        res = await self.client.delete(f"/rest/v1/inventory?id=eq.{item_id}")
        res.raise_for_status()
        return {"success": True}

    # =========================================================
    # Injuries Management
    # =========================================================
    async def get_injuries(self):
        return await self._get("/rest/v1/injuries?select=*,players(user_id,full_name)&order=injury_date.desc")

    async def insert_injury(self, data: dict):
        return await self._post("/rest/v1/injuries", data)

    async def update_injury(self, injury_id: str, data: dict):
        res = await self.client.patch(f"/rest/v1/injuries?id=eq.{injury_id}", json=data)
        res.raise_for_status()
        return res.json()

    async def delete_injury(self, injury_id: str):
        res = await self.client.delete(f"/rest/v1/injuries?id=eq.{injury_id}")
        res.raise_for_status()
        return {"success": True}

    # =========================================================
    # Training Sessions Management
    # =========================================================
    async def get_training_sessions(self):
        return await self._get("/rest/v1/training_sessions?select=*&order=session_date.desc")

    async def get_training_sessions_by_coach(self, coach_id: str):
        return await self._get(f"/rest/v1/training_sessions?coach_id=eq.{coach_id}&order=session_date.desc")

    async def insert_training_session(self, data: dict):
        return await self._post("/rest/v1/training_sessions", data)

    async def update_training_session(self, session_id: str, data: dict):
        res = await self.client.patch(f"/rest/v1/training_sessions?id=eq.{session_id}", json=data)
        res.raise_for_status()
        return res.json()

    async def delete_training_session(self, session_id: str):
        res = await self.client.delete(f"/rest/v1/training_sessions?id=eq.{session_id}")
        if res.status_code not in [200, 201, 204]:
            res.raise_for_status()
        return {"success": True}

    async def delete_public_request(self, request_id: str):
        res = await self.client.delete(f"/rest/v1/public_requests?id=eq.{request_id}")
        if res.status_code not in [200, 201, 204]:
            res.raise_for_status()
        return {"success": True}

    # =========================================================
    # Kit Assignments Management
    # =========================================================
    async def get_kit_assignments(self):
        return await self._get("/rest/v1/kit_assignments?select=*&order=created_at.desc")

    async def get_kit_assignments_by_player(self, player_id: str):
        return await self._get(f"/rest/v1/kit_assignments?player_id=eq.{player_id}&order=assigned_date.desc")

    async def insert_kit_assignment(self, data: dict):
        return await self._post("/rest/v1/kit_assignments", data)

    async def update_kit_assignment(self, assignment_id: str, data: dict):
        res = await self.client.patch(f"/rest/v1/kit_assignments?id=eq.{assignment_id}", json=data)
        res.raise_for_status()
        return res.json()

    async def delete_kit_assignment(self, assignment_id: str):
        res = await self.client.delete(f"/rest/v1/kit_assignments?id=eq.{assignment_id}")
        if res.status_code not in [200, 201, 204]:
            res.raise_for_status()
        return {"success": True}

    # =========================================================
    # Medical Records Management
    # =========================================================
    async def get_medical_records(self):
        return await self._get("/rest/v1/medical_records?select=*&order=created_at.desc")

    async def get_medical_record_by_player(self, player_id: str):
        data = await self._get(f"/rest/v1/medical_records?player_id=eq.{player_id}")
        return data[0] if data else None

    async def upsert_medical_record(self, data: dict):
        headers = {"Prefer": "resolution=merge-duplicates"}
        return await self._post("/rest/v1/medical_records", data, headers=headers)

    async def update_medical_record(self, record_id: str, data: dict):
        res = await self.client.patch(f"/rest/v1/medical_records?id=eq.{record_id}", json=data)
        res.raise_for_status()
        return res.json()

    async def delete_medical_record(self, record_id: str):
        res = await self.client.delete(f"/rest/v1/medical_records?id=eq.{record_id}")
        if res.status_code not in [200, 201, 204]:
            res.raise_for_status()
        return {"success": True}

    # =========================================================
    # Storage Management (Supabase Storage API)
    # =========================================================
    async def upload_file(self, bucket: str, path: str, content: bytes, content_type: str):
        """Upload a file to Supabase Storage and return the public URL."""
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": content_type,
            "x-upsert": "true",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{self.url}/storage/v1/object/{bucket}/{path}",
                content=content,
                headers=headers
            )
            res.raise_for_status()
        return f"{self.url}/storage/v1/object/public/{bucket}/{path}"

    async def get_public_url(self, bucket: str, path: str):
        """Get the public URL for a file."""
        return f"{self.url}/storage/v1/object/public/{bucket}/{path}"

    async def delete_file(self, bucket: str, path: str):
        """Delete a file from Supabase Storage."""
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.delete(
                f"{self.url}/storage/v1/object/{bucket}/{path}",
                headers=headers
            )
            if res.status_code not in [200, 204]:
                res.raise_for_status()
        return {"success": True}

    # =========================================================
    # Tournaments & Tryouts Management
    # =========================================================
    async def get_tournaments(self):
        return await self._get("/rest/v1/tournaments?select=*&order=created_at.desc")

    async def insert_tournament(self, data: dict):
        return await self._post("/rest/v1/tournaments", data)

    async def get_tournament_teams(self, tournament_id: str):
        return await self._get(f"/rest/v1/tournament_teams?tournament_id=eq.{tournament_id}&select=*&order=points.desc,goals_for.desc")

    async def insert_tournament_team(self, data: dict):
        return await self._post("/rest/v1/tournament_teams", data)

    async def get_tournament_matches(self, tournament_id: str):
        return await self._get(f"/rest/v1/tournament_matches?tournament_id=eq.{tournament_id}&select=*,team_a:tournament_teams!team_a_id(name),team_b:tournament_teams!team_b_id(name)&order=match_date.asc")

    async def insert_tournament_match(self, data: dict):
        return await self._post("/rest/v1/tournament_matches", data)

    async def update_tournament_match(self, match_id: str, data: dict):
        res = await self.client.patch(f"/rest/v1/tournament_matches?id=eq.{match_id}", json=data)
        res.raise_for_status()
        return res.json()

    async def update_tournament_team(self, team_id: str, data: dict):
        res = await self.client.patch(f"/rest/v1/tournament_teams?id=eq.{team_id}", json=data)
        res.raise_for_status()
        return res.json()

    async def get_tryouts(self):
        return await self._get("/rest/v1/tryouts?select=*&order=created_at.desc")

    async def insert_tryout(self, data: dict):
        return await self._post("/rest/v1/tryouts", data)

    async def get_tryout_candidates(self, tryout_id: str):
        return await self._get(f"/rest/v1/tryout_candidates?tryout_id=eq.{tryout_id}&select=*&order=full_name.asc")

    async def insert_tryout_candidate(self, data: dict):
        return await self._post("/rest/v1/tryout_candidates", data)

    async def update_tryout_candidate(self, candidate_id: str, data: dict):
        res = await self.client.patch(f"/rest/v1/tryout_candidates?id=eq.{candidate_id}", json=data)
        res.raise_for_status()
        return res.json()


supabase = SupabaseHttpClient(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY,
    service_role_key=settings.SUPABASE_SERVICE_ROLE_KEY
)

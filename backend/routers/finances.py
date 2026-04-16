import logging
from fastapi import APIRouter, Depends, HTTPException, status
from core.auth_middleware import verify_token, assert_parent_owns_player
from typing import List

logger = logging.getLogger("finances")
from datetime import date, timedelta
from schemas.finances import PaymentCreate, PaymentResponse, SubscriptionCreate, SubscriptionResponse
from services.supabase_client import supabase
from services.billing_engine import (
    calculate_prorata,
    get_next_due_date,
    get_alert_status,
    get_alert_notification,
    generate_invoice_number
)
from core.auth_middleware import verify_token, require_role
from core.context import user_id_ctx, role_ctx

router = APIRouter(prefix="/finances", tags=["Finances"], dependencies=[Depends(verify_token)])


# =========================================================
# PAYMENTS (Legacy + Enhanced)
# =========================================================

@router.get("/payments")
async def get_all_payments(user: dict = Depends(require_role("admin", "coach", "super_admin"))):
    """كل الدفعات — فقط الأدمين والمدرب يقدر يشوفها"""
    try:
        return await supabase.get_payments()
    except Exception as e:
        logger.error("خطأ في جلب الدفعات: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.get("/payments/player/{player_id}")
async def get_payments_by_player(player_id: str):
    current_role = role_ctx.get()
    current_user = user_id_ctx.get()
    if current_role == "parent":
        await assert_parent_owns_player(current_user, player_id)
    try:
        return await supabase.get_payments_by_player(player_id)
    except Exception as e:
        logger.error("Error fetching player payments: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.get("/payments/user/{user_id}")
async def get_payments_by_user(user_id: str):
    """دفعات مستخدم معين — الولي يشوف فقط دفعات ديالو/ديال ولده"""
    try:
        current_role = role_ctx.get()
        current_user = user_id_ctx.get()
        
        # الولي يقدر يشوف فقط دفعاته — الأدمين يشوف أي حد
        if current_role == "parent" and current_user != user_id:
            # نتأكد أن هذا هو ولد الولي
            from core.config import settings
            players_res = await supabase.client.get(
                f"{settings.SUPABASE_URL}/rest/v1/players?parent_id=eq.{current_user}&user_id=eq.{user_id}&select=id"
            )
            if not (players_res.status_code == 200 and players_res.json()):
                raise HTTPException(status_code=403, detail="غير مسموح — يمكنك فقط مشاهدة دفعات طفلك")
        
        from core.config import settings
        res = await supabase.client.get(
            f"{settings.SUPABASE_URL}/rest/v1/payments?user_id=eq.{user_id}&select=*&order=payment_date.desc"
        )
        res.raise_for_status()
        return res.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("خطأ في جلب دفعات المستخدم: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.post("/payments")
async def create_payment(payment: PaymentCreate, user: dict = Depends(require_role("admin", "coach", "super_admin"))):
    """إنشاء دفعة — فقط الأدمين"""
    try:
        payment_dict = payment.model_dump(exclude_none=True)
        if payment.payment_date:
            payment_dict['payment_date'] = payment.payment_date.isoformat()

        response = await supabase.insert_payment(payment_dict)

        # Notification logic
        status_map = {
            "Completed": ("تم الدفع بنجاح", "نؤكد لكم استلام الدفعة بنجاح. شكراً لكم!", "success"),
            "Pending":   ("قرب موعد الأداء", "اقترب موعد أداء الرسوم، يرجى التسوية في أقرب وقت.", "alert"),
            "Overdue":   ("تأخير في الأداء", "نود تذكيركم بأن هناك تأخير في أداء رسوم الاشتراك.", "alert"),
        }
        title, msg, notif_type = status_map.get(payment.status, ("Payment Update", f"Status: {payment.status}", "alert"))
        try:
            if payment.user_id:
                await supabase.insert_notification({"user_id": payment.user_id, "title": title, "message": msg, "type": notif_type})
            await supabase.insert_notification({"title": f"Payment {payment.status}", "message": f"{payment.amount} MAD — {payment.status}", "type": "admin_alert", "target_role": "Admin"})
        except Exception as e:
            logger.warning(f"Notification error: {e}")

        return response[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("خطأ في حفظ الدفعة: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.post("/payments/parent")
async def create_parent_payment(payment: PaymentCreate):
    """
    🔒 إنشاء دفعة من ولي الأمر — دائماً Pending
    الولي يرسل إثبات دفع فقط — الأدمين هو من يأكد
    
    ⚠️ هذا المسار مفصول تماماً عن مالية الأدمين والـ SaaS
    """
    try:
        current_user = user_id_ctx.get()
        
        payment_dict = payment.model_dump(exclude_none=True)
        if payment.payment_date:
            payment_dict['payment_date'] = payment.payment_date.isoformat()
        
        # ✅ إجبار الحالة = معلق — الولي لا يقدر يأكد الدفع بنفسه
        payment_dict['status'] = 'Pending'
        payment_dict['user_id'] = payment.user_id or current_user
        
        response = await supabase.insert_payment(payment_dict)
        
        # إشعار الأدمين — ولي أمر أرسل إثبات دفع
        try:
            await supabase.insert_notification({
                "title": "📩 إثبات دفع جديد من ولي أمر",
                "message": f"تم استلام إثبات دفع بقيمة {payment.amount} درهم. يرجى المراجعة والتأكيد.",
                "type": "admin_alert",
                "target_role": "Admin"
            })
        except Exception as e:
            logger.warning(f"Notification error: {e}")
        
        return response[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("خطأ في إرسال إثبات الدفع: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, user: dict = Depends(require_role("admin", "super_admin"))):
    """حذف دفعة — فقط الأدمين"""
    try:
        await supabase.delete_payment(payment_id)
        return {"message": "Payment deleted successfully"}
    except Exception as e:
        logger.error("Error deleting payment: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.patch("/payments/{payment_id}")
async def update_payment(payment_id: str, payment: PaymentCreate, user: dict = Depends(require_role("admin", "super_admin"))):
    """تحديث دفعة — فقط الأدمين"""
    try:
        payment_dict = payment.model_dump(exclude_none=True)
        if payment.payment_date:
            payment_dict['payment_date'] = payment.payment_date.isoformat()

        response = await supabase.update_payment(payment_id, payment_dict)

        if response:
            status_map = {
                "Completed": ("تم الدفع بنجاح", "نؤكد لكم استلام الدفعة بنجاح.", "success"),
                "Pending":   ("قرب موعد الأداء", "اقترب موعد أداء الرسوم.", "alert"),
                "Overdue":   ("تأخير في الأداء", "هناك تأخير في أداء رسوم الاشتراك.", "alert"),
            }
            title, msg, notif_type = status_map.get(payment.status, ("Payment Update", f"Status: {payment.status}", "alert"))
            try:
                if payment.user_id:
                    await supabase.insert_notification({"user_id": payment.user_id, "title": title, "message": msg, "type": notif_type})
                await supabase.insert_notification({"title": f"Payment {payment.status} (Updated)", "message": f"{payment.amount} MAD — {payment.status}", "type": "admin_alert", "target_role": "Admin"})
            except Exception as e:
                logger.warning(f"Notification error: {e}")

        return response[0] if response else {"success": True}
    except Exception as e:
        logger.error("Error updating payment: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# =========================================================
# SUBSCRIPTIONS
# =========================================================

@router.get("/subscriptions")
async def get_all_subscriptions(user: dict = Depends(require_role("admin", "coach", "super_admin"))):
    try:
        subs = await supabase.get_subscriptions()
        academy_settings = await supabase.get_academy_settings() or {}
        season_end_str = academy_settings.get("season_end")
        season_end = date.fromisoformat(season_end_str) if season_end_str else None
        
        today = date.today()
        # Compute alert_status dynamically for display
        for s in subs:
            if s.get("next_due_date"):
                nd = date.fromisoformat(s["next_due_date"])
                s["days_until_due"] = (nd - today).days
                s["alert_status_realtime"] = get_alert_status(nd, season_end)
        return subs
    except Exception as e:
        logger.error("Error fetching subscriptions: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.get("/subscriptions/player/{player_id}")
async def get_subscription_by_player(player_id: str):
    current_role = role_ctx.get()
    current_user = user_id_ctx.get()
    if current_role == "parent":
        await assert_parent_owns_player(current_user, player_id)
    try:
        sub = await supabase.get_subscription_by_player(player_id)
        if sub and sub.get("next_due_date"):
            nd = date.fromisoformat(sub["next_due_date"])
            sub["days_until_due"] = (nd - date.today()).days
        return sub or {}
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.post("/subscriptions")
async def create_subscription(sub: SubscriptionCreate):
    try:
        start = sub.start_date

        # Calculate prorata for first partial month
        prorata_amount, prorata_days = calculate_prorata(start, sub.monthly_amount)

        # Determine next due date
        first_of_next_month = get_next_due_date("monthly", start.replace(day=1))
        next_due = first_of_next_month if prorata_days < 28 else get_next_due_date(sub.billing_type, start)

        # Invoice number (sync method - no await needed)
        inv_seq = supabase.get_next_invoice_sequence()
        invoice_number = generate_invoice_number(inv_seq if isinstance(inv_seq, int) else 1000)

        sub_data = {
            "player_id": sub.player_id,
            "user_id": sub.user_id,
            "billing_type": sub.billing_type,
            "start_date": start.isoformat(),
            "next_due_date": next_due.isoformat(),
            "monthly_amount": sub.monthly_amount,
            "annual_amount": sub.annual_amount or (sub.monthly_amount * 12),
            "prorata_days": prorata_days,
            "prorata_amount": prorata_amount,
            "status": "active",
            "alert_status": "none",
            "notes": sub.notes
        }

        result = await supabase.insert_subscription(sub_data)

        # Auto-create a prorata payment invoice for the first month
        if prorata_days < 28:
            try:
                await supabase.insert_payment({
                    "player_id": sub.player_id,
                    "user_id": sub.user_id,
                    "amount": prorata_amount,
                    "amount_due": prorata_amount,
                    "billing_type": "prorata",
                    "status": "Pending",
                    "payment_method": "Cash",
                    "due_date": next_due.isoformat(),
                    "period_start": start.isoformat(),
                    "period_end": (next_due - timedelta(days=1)).isoformat(),
                    "invoice_number": invoice_number,
                    "notes": f"Prorata {prorata_days} jours"
                })
            except Exception as e:
                logger.warning(f"Prorata payment creation error: {e}")

        # Notify admin
        try:
            await supabase.insert_notification({
                "title": "🆕 Abonnement Créé",
                "message": f"Nouvel abonnement {sub.billing_type} créé. Prorata: {prorata_amount} MAD pour {prorata_days} jours.",
                "type": "admin_alert",
                "target_role": "Admin"
            })
        except Exception as e:
            logger.warning(f"Notification error: {e}")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating subscription: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.patch("/subscriptions/{sub_id}")
async def update_subscription(sub_id: str, data: dict):
    try:
        # If terminating, update player account status too
        # TODO: Implement player status update if needed
        result = await supabase.update_subscription(sub_id, data)
        return result
    except Exception as e:
        logger.error("Error updating subscription: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.delete("/subscriptions/{sub_id}")
async def delete_subscription(sub_id: str):
    try:
        await supabase.delete_subscription(sub_id)
        return {"success": True}
    except Exception as e:
        logger.error("Error deleting subscription: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# =========================================================
# SMART ALERT CHECK — Run manually or via CRON
# =========================================================

@router.post("/alert-check")
async def run_alert_check():
    """
    Check all active subscriptions and send alerts based on due date status.
    Should be called daily (can be triggered manually from admin panel or a scheduler).
    """
    try:
        subs = await supabase.get_subscriptions()
        academy_settings = await supabase.get_academy_settings() or {}
        season_end_str = academy_settings.get("season_end")
        season_end = date.fromisoformat(season_end_str) if season_end_str else None
        
        alerts_sent = []
        today = date.today()

        for sub in subs:
            if sub.get("status") != "active":
                continue

            sub_id = sub["id"]
            next_due_raw = sub.get("next_due_date")
            if not next_due_raw:
                continue

            next_due = date.fromisoformat(next_due_raw)
            alert = get_alert_status(next_due, season_end)
            prev_alert = sub.get("alert_status", "none")

            # Only send if alert level changed (avoid spam)
            if alert == prev_alert or alert == "none":
                continue

            # Get player name
            player_info = sub.get("players") or {}
            player_name = player_info.get("full_name", "Un joueur")

            notif = get_alert_notification(alert, player_name)
            if notif:
                try:
                    await supabase.insert_notification({
                        **notif,
                        "target_role": "Admin"
                    })
                    # Also notify parent if user_id exists
                    if sub.get("user_id"):
                        await supabase.insert_notification({
                            **notif,
                            "user_id": sub["user_id"]
                        })
                except Exception as e:
                    logger.warning(f"Notification error for sub {sub_id}: {e}")

            # Auto-update player status if suspended/terminated
            if alert == "terminated":
                try:
                    await supabase.update_subscription(sub_id, {"status": "terminated", "alert_status": "terminated"})
                except Exception as e:
                    logger.warning(f"Auto-terminate error: {e}")
            else:
                try:
                    await supabase.update_subscription_alert_status(sub_id, alert)
                except Exception as e:
                    logger.warning(f"Alert status update error: {e}")

            alerts_sent.append({"sub_id": sub_id, "player": player_name, "new_alert": alert})

        return {"success": True, "alerts_sent": len(alerts_sent), "details": alerts_sent}
    except Exception as e:
        logger.error("Alert check failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.post("/subscriptions/{sub_id}/generate-invoice")
async def generate_invoice(sub_id: str):
    """Generate next monthly invoice for a subscription."""
    try:
        subs = await supabase.get_subscriptions()
        sub = next((s for s in subs if s["id"] == sub_id), None)
        if not sub:
            raise HTTPException(status_code=404, detail="Subscription not found")

        next_due = date.fromisoformat(sub["next_due_date"])
        period_end = get_next_due_date(sub["billing_type"], next_due)

        # get_next_invoice_sequence is sync - no await needed
        inv_seq = supabase.get_next_invoice_sequence()
        invoice_number = generate_invoice_number(inv_seq if isinstance(inv_seq, int) else 2000)

        # Determine amount based on billing type
        if sub["billing_type"] == "annual":
            amount = sub.get("annual_amount") or (sub["monthly_amount"] * 12)
        elif sub["billing_type"] == "hybrid":
            amount = sub["monthly_amount"] * 3
        else:
            amount = sub["monthly_amount"]

        payment = await supabase.insert_payment({
            "player_id": sub["player_id"],
            "user_id": sub.get("user_id"),
            "amount": amount,
            "amount_due": amount,
            "billing_type": sub["billing_type"],
            "status": "Pending",
            "payment_method": "Cash",
            "due_date": next_due.isoformat(),
            "period_start": next_due.isoformat(),
            "period_end": period_end.isoformat(),
            "invoice_number": invoice_number,
        })

        # Advance the next_due_date in subscription
        new_next_due = get_next_due_date(sub["billing_type"], next_due)
        await supabase.update_subscription(sub_id, {"next_due_date": new_next_due.isoformat(), "alert_status": "none"})

        return {"success": True, "invoice_number": invoice_number, "amount": amount, "due_date": next_due.isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error generating invoice: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.post("/test-notification/{user_id}")
async def send_test_notification(user_id: str):
    """Send a dummy notification for testing the alert system."""
    try:
        await supabase.insert_notification({
            "user_id": user_id,
            "title": "🔔 اختبار تنبيه الأداء",
            "message": "هذا مثال على تنبيه اقتراب موعد الأداء (تذكير). يرجى التحقق من وضعيتكم المالية.",
            "type": "alert"
        })
        return {"success": True}
    except Exception as e:
        logger.error("Error sending test notification: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

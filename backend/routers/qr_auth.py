"""
QR Code Login — نظام ربط الهاتف باللابتوب بحال WhatsApp Web
WebSocket-based session pairing

How it works:
1. 💻 اللابتوب يفتح /qr-login → يولّد session_id عشوائي → يعرض QR Code
2. 📱 الهاتف (مسجل دخول) يسكاني الـ QR → يرسل token + session_id للـ API
3. 🔗 السيرفر يتحقق من الـ token → يولّد token جديد للابتوب
4. 💻 اللابتوب يتلقى الـ token عبر polling → يسجل دخول أوتوماتيكياً
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import uuid
import time
from ..core.auth import get_current_user

router = APIRouter(prefix="/api/qr-auth", tags=["QR Authentication"])

# مخزن مؤقت للجلسات (في الإنتاج استعمل Redis)
qr_sessions = {}

# مدة صلاحية QR Code (3 دقائق)
QR_EXPIRY = 180


class QRSession(BaseModel):
    session_id: str
    status: str  # pending, authorized, expired
    token: str | None = None
    role: str | None = None
    user_id: str | None = None
    user_name: str | None = None
    academy_id: str | None = None
    created_at: float


class QRAuthorizeRequest(BaseModel):
    session_id: str


# ─── 1. إنشاء جلسة QR (اللابتوب) ──────────────────────────
@router.post("/create-session")
async def create_qr_session():
    """اللابتوب يطلب session_id جديد لعرض QR Code"""
    session_id = str(uuid.uuid4())
    
    qr_sessions[session_id] = QRSession(
        session_id=session_id,
        status="pending",
        created_at=time.time()
    )
    
    # تنظيف الجلسات المنتهية
    cleanup_expired_sessions()
    
    return {"session_id": session_id, "expires_in": QR_EXPIRY}


# ─── 2. تأكيد الجلسة (الهاتف) ───────────────────────────────
@router.post("/authorize")
async def authorize_qr_session(
    request: QRAuthorizeRequest,
    current_user: dict = Depends(get_current_user)
):
    """الهاتف يسكاني الـ QR ويرسل تأكيد"""
    session = qr_sessions.get(request.session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    if session.status != "pending":
        raise HTTPException(status_code=400, detail="Session already used")
    
    if time.time() - session.created_at > QR_EXPIRY:
        session.status = "expired"
        raise HTTPException(status_code=410, detail="QR Code expired")
    
    # تحديث الجلسة بمعلومات المستخدم
    session.status = "authorized"
    session.token = current_user.get("token", "")
    session.role = current_user.get("role", "")
    session.user_id = str(current_user.get("id", ""))
    session.user_name = current_user.get("full_name", current_user.get("email", ""))
    session.academy_id = str(current_user.get("academy_id", ""))
    
    qr_sessions[request.session_id] = session
    
    return {"status": "authorized", "message": "✅ تم ربط الجلسة بنجاح!"}


# ─── 3. فحص حالة الجلسة (اللابتوب — polling) ────────────────
@router.get("/check-session/{session_id}")
async def check_qr_session(session_id: str):
    """اللابتوب يسأل كل ثانية: واش تم السكان؟"""
    session = qr_sessions.get(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if time.time() - session.created_at > QR_EXPIRY:
        session.status = "expired"
        return {"status": "expired"}
    
    if session.status == "authorized":
        # حذف الجلسة بعد الاستعمال (مرة واحدة فقط)
        result = {
            "status": "authorized",
            "token": session.token,
            "role": session.role,
            "user_id": session.user_id,
            "user_name": session.user_name,
            "academy_id": session.academy_id
        }
        del qr_sessions[session_id]
        return result
    
    return {"status": "pending"}


def cleanup_expired_sessions():
    """تنظيف الجلسات المنتهية"""
    now = time.time()
    expired = [sid for sid, s in qr_sessions.items() if now - s.created_at > QR_EXPIRY * 2]
    for sid in expired:
        del qr_sessions[sid]

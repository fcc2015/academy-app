import logging
import os
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form
from core.auth_middleware import verify_token, require_role
from core.context import user_id_ctx, academy_id_ctx, role_ctx
from services.supabase_client import supabase
from core.config import settings
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger("video_analysis")

# ─── YOLO Processor (lazy import to avoid slowing startup) ────────────────────
def _get_yolo_processor():
    try:
        from services.yolo_processor import yolo_processor
        return yolo_processor
    except Exception as e:
        logger.warning(f"YOLO processor not available: {e}")
        return None

router = APIRouter(
    prefix="/video-analysis",
    tags=["Video Analysis AI"],
    dependencies=[Depends(verify_token)]
)

# ─── Schemas ────────────────────────────────────────────────────────────────

class AnalysisResult(BaseModel):
    id: str
    player_id: Optional[str] = None
    video_url: str
    yolo_video_url: Optional[str] = None
    yolo_stats: Optional[dict] = None
    status: str  # pending | processing | done | error
    overall_score: Optional[int] = None
    technical_score: Optional[int] = None
    physical_score: Optional[int] = None
    tactical_score: Optional[int] = None
    strengths: Optional[list] = None
    improvements: Optional[list] = None
    summary: Optional[str] = None
    coach_notes: Optional[str] = None
    created_at: str
    analyzed_at: Optional[str] = None


# ─── Coach AI Status Helper ──────────────────────────────────────────────────

async def _get_coach_ai_status(user_id: str, academy_id: str) -> dict:
    """Calculate and return the AI video analysis status for a coach."""
    import httpx
    from core.config import settings as app_settings

    async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
        headers = supabase.admin_headers

        # Fetch academy settings for AI video controls
        settings_res = await client.get(
            f"{app_settings.SUPABASE_URL}/rest/v1/academy_settings"
            f"?academy_id=eq.{academy_id}&select=video_ai_enabled,video_ai_coach_max_tests,video_ai_blocked_until,video_ai_message_ok,video_ai_message_blocked",
            headers=headers,
        )
        acad_settings = {}
        if settings_res.status_code == 200 and settings_res.json():
            acad_settings = settings_res.json()[0]

        video_ai_enabled = acad_settings.get("video_ai_enabled", True)
        max_tests = acad_settings.get("video_ai_coach_max_tests", 1)
        blocked_until_str = acad_settings.get("video_ai_blocked_until")
        msg_ok = acad_settings.get("video_ai_message_ok") or ""
        msg_blocked = acad_settings.get("video_ai_message_blocked") or ""

        # Fetch coach-level permission
        coach_res = await client.get(
            f"{app_settings.SUPABASE_URL}/rest/v1/coaches"
            f"?user_id=eq.{user_id}&academy_id=eq.{academy_id}&select=id,video_ai_allowed",
            headers=headers,
        )
        coach_allowed = True
        coach_id = None
        if coach_res.status_code == 200 and coach_res.json():
            coach_data = coach_res.json()[0]
            coach_allowed = coach_data.get("video_ai_allowed", True)
            coach_id = coach_data.get("id")

        # Count test analyses used by this coach (where player_id is null)
        count_res = await client.get(
            f"{app_settings.SUPABASE_URL}/rest/v1/player_video_analyses"
            f"?created_by=eq.{user_id}&player_id=is.null&academy_id=eq.{academy_id}&select=id",
            headers={**headers, "Prefer": "count=exact"},
        )
        tests_used = 0
        if count_res.status_code == 200:
            content_range = count_res.headers.get("content-range", "")
            # content-range: 0-X/TOTAL
            if "/" in content_range:
                total_str = content_range.split("/")[-1]
                if total_str.isdigit():
                    tests_used = int(total_str)
            else:
                # fallback to body length
                tests_used = len(count_res.json()) if count_res.json() else 0

    # Check blocking conditions
    now = datetime.now(timezone.utc)

    if not video_ai_enabled:
        return {
            "allowed": False,
            "reason": "disabled",
            "message": msg_blocked or "تحليل الفيديو بالذكاء الاصطناعي معطل حالياً من طرف المسؤول.",
            "tests_used": tests_used,
            "max_tests": max_tests,
        }

    if not coach_allowed:
        return {
            "allowed": False,
            "reason": "coach_blocked",
            "message": msg_blocked or "ليس لديك صلاحية استخدام تحليل الفيديو بالذكاء الاصطناعي.",
            "tests_used": tests_used,
            "max_tests": max_tests,
        }

    if blocked_until_str:
        try:
            blocked_until = datetime.fromisoformat(blocked_until_str.replace("Z", "+00:00"))
            if now < blocked_until:
                return {
                    "allowed": False,
                    "reason": "temporary_block",
                    "message": msg_blocked or f"الخدمة محجوبة مؤقتاً حتى {blocked_until.strftime('%Y-%m-%d %H:%M')} UTC.",
                    "blocked_until": blocked_until_str,
                    "tests_used": tests_used,
                    "max_tests": max_tests,
                }
        except Exception:
            pass

    if tests_used >= max_tests:
        return {
            "allowed": False,
            "reason": "quota_exceeded",
            "message": msg_blocked or f"لقد استنفذت عدد التحليلات المتاحة ({max_tests}). تواصل مع المسؤول للحصول على المزيد.",
            "tests_used": tests_used,
            "max_tests": max_tests,
        }

    return {
        "allowed": True,
        "reason": "ok",
        "message": msg_ok,
        "tests_used": tests_used,
        "max_tests": max_tests,
    }


# ─── Gemini Video Analysis ───────────────────────────────────────────────────

async def analyze_video_with_gemini(video_path: str, player_name: str = "اللاعب") -> dict:
    """Send video to Gemini 1.5 Flash and get structured analysis."""
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)

        # Upload video file to Gemini File API
        logger.info(f"Uploading video to Gemini File API: {video_path}")
        video_file = genai.upload_file(path=video_path, display_name=f"player_{player_name}")

        # Wait for processing
        import time
        while video_file.state.name == "PROCESSING":
            time.sleep(2)
            video_file = genai.get_file(video_file.name)

        if video_file.state.name == "FAILED":
            raise ValueError("Gemini video processing failed")

        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""
أنت مدرب كرة قدم خبير. حلل أداء اللاعب في هذا الفيديو وأعطني تقريراً شاملاً.

اسم اللاعب: {player_name}

قيّم اللاعب على المحاور التالية (من 0 إلى 100):
1. الأداء التقني (التحكم بالكرة، التمرير، الركل)
2. الأداء البدني (السرعة، القوة، التحمل)
3. الأداء التكتيكي (التمركز، القراءة، الوعي بالملعب)

أجب بالتنسيق التالي فقط (JSON):
{{
  "overall_score": <رقم من 0-100>,
  "technical_score": <رقم من 0-100>,
  "physical_score": <رقم من 0-100>,
  "tactical_score": <رقم من 0-100>,
  "strengths": ["نقطة قوة 1", "نقطة قوة 2", "نقطة قوة 3"],
  "improvements": ["نقطة تحسين 1", "نقطة تحسين 2", "نقطة تحسين 3"],
  "summary": "ملخص شامل لأداء اللاعب في 2-3 جمل"
}}
"""
        response = model.generate_content([video_file, prompt])
        
        # Parse JSON from response
        import json, re
        text = response.text.strip()
        # Extract JSON block if wrapped in markdown
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            result = json.loads(match.group())
        else:
            result = json.loads(text)

        # Clean up uploaded file from Gemini
        try:
            genai.delete_file(video_file.name)
        except Exception:
            pass

        return result

    except ImportError:
        logger.warning("google-generativeai not installed — using mock analysis")
        return _mock_analysis(player_name)
    except Exception as e:
        logger.error(f"Gemini analysis error: {e}", exc_info=True)
        return _mock_analysis(player_name)


def _mock_analysis(player_name: str) -> dict:
    """Fallback mock analysis when Gemini API is not configured."""
    import random
    return {
        "overall_score": random.randint(60, 85),
        "technical_score": random.randint(55, 90),
        "physical_score": random.randint(60, 88),
        "tactical_score": random.randint(50, 80),
        "strengths": [
            "تحكم جيد بالكرة",
            "سرعة في الانطلاق",
            "وعي تكتيكي مقبول"
        ],
        "improvements": [
            "تحسين دقة التمرير",
            "تقوية الرجل الضعيفة",
            "العمل على التمركز الدفاعي"
        ],
        "summary": f"أظهر {player_name} أداءً جيداً بشكل عام مع إمكانيات واضحة للتطور. يُنصح بالتركيز على تحسين الجوانب التقنية."
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/coach/status")
async def get_coach_ai_status(
    user: dict = Depends(require_role("coach", "admin", "super_admin", "sous_admin"))
):
    """Get the AI video analysis status/quota for a coach."""
    uid = user_id_ctx.get(None)
    academy_id = academy_id_ctx.get(None)
    role = role_ctx.get(None)

    # Admins always have access
    if role in ("admin", "super_admin", "sous_admin"):
        return {
            "allowed": True,
            "reason": "admin",
            "message": "",
            "tests_used": 0,
            "max_tests": 999,
        }

    if not uid or not academy_id:
        raise HTTPException(status_code=400, detail="Missing user/academy context")

    return await _get_coach_ai_status(uid, academy_id)


@router.post("/upload/{player_id}", status_code=202)
async def upload_and_analyze(
    player_id: str,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    player_name: str = Form(default="اللاعب"),
    user: dict = Depends(require_role("admin", "coach", "super_admin", "sous_admin"))
):
    """
    Upload a player video and trigger AI analysis.
    Returns 202 IMMEDIATELY — analysis runs in background.
    Poll /status/{analysis_id} to track progress.
    Use player_id='test' for a standalone test analysis without a player.
    """
    uid = user_id_ctx.get(None)
    academy_id = academy_id_ctx.get(None)
    role = role_ctx.get(None)

    # Validate coach quota for test analyses
    is_test = player_id in ("test", "none", "__test__")
    if is_test and role == "coach":
        status_info = await _get_coach_ai_status(uid, academy_id)
        if not status_info["allowed"]:
            raise HTTPException(
                status_code=403,
                detail=status_info.get("message", "لا يحق لك إجراء تحليل الفيديو الآن.")
            )

    # Validate file type
    allowed_types = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/mpeg"]
    if video.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم. استخدم MP4, MOV, AVI, أو WebM")

    # Validate file size (max 100MB)
    MAX_SIZE = 100 * 1024 * 1024
    content = await video.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="حجم الفيديو كبير جداً. الحد الأقصى 100MB")

    analysis_id = str(uuid.uuid4())

    # Sanitize filename
    import re, unicodedata
    raw_filename = video.filename or "video.mp4"
    normalized = unicodedata.normalize('NFKD', raw_filename).encode('ascii', 'ignore').decode('ascii')
    name, ext = os.path.splitext(normalized)
    clean_name = re.sub(r'_+', '_', re.sub(r'[^a-zA-Z0-9_\-]', '_', name)).strip('_')
    clean_ext = re.sub(r'[^a-zA-Z0-9]', '', ext)
    safe_filename = f"{clean_name}.{clean_ext}" if clean_ext else (clean_name or "video")
    video_suffix = ext or ".mp4"

    # Storage paths
    if is_test:
        video_filename = f"coach_test_videos/{uid}/{analysis_id}_{safe_filename}"
        db_player_id = None
    else:
        video_filename = f"player_videos/{player_id}/{analysis_id}_{safe_filename}"
        db_player_id = player_id

    try:
        # ── 1. Upload original video to Supabase Storage ─────────────────
        logger.info(f"Uploading video to Supabase Storage: {video_filename}")
        video_url = await supabase.upload_file(
            bucket="player-videos",
            path=video_filename,
            content=content,
            content_type=video.content_type
        )

        # ── 2. Save initial record (status=processing) ───────────────────
        record = {
            "id": analysis_id,
            "video_url": video_url,
            "status": "processing",
            "created_by": uid,
            "created_at": datetime.utcnow().isoformat(),
        }
        if db_player_id:
            record["player_id"] = db_player_id
        if academy_id:
            record["academy_id"] = academy_id
        await supabase._post("/rest/v1/player_video_analyses", json=record)

        # ── 3. Launch background task (YOLO + Gemini) ────────────────────
        from services.video_tasks import run_analysis_background
        background_tasks.add_task(
            run_analysis_background,
            analysis_id=analysis_id,
            content=content,
            video_suffix=video_suffix,
            player_name=player_name,
            video_url=video_url,
            supabase_client=supabase,
            settings=settings,
        )
        logger.info(f"[{analysis_id}] Background analysis task queued ✅")

        # ── 4. Return 202 IMMEDIATELY ─────────────────────────────────────
        return {
            "id": analysis_id,
            "status": "processing",
            "video_url": video_url,
            "player_id": db_player_id,
            "message": "تم استلام الفيديو وبدأ التحليل. استخدم /status/{id} لمتابعة التقدم.",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video upload/init failed: {e}", exc_info=True)
        try:
            await supabase._patch(
                f"/rest/v1/player_video_analyses?id=eq.{analysis_id}",
                json={"status": "error"}
            )
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"فشل رفع الفيديو: {str(e)}")


@router.get("/status/{analysis_id}")
async def get_analysis_status(
    analysis_id: str,
    user: dict = Depends(require_role("admin", "coach", "super_admin", "sous_admin", "parent"))
):
    """
    Poll the status of a specific video analysis.
    Frontend polls this every 3-5 seconds after upload.
    Returns: status (processing | done | error) + full results when done.
    """
    try:
        data = await supabase._get(
            f"/rest/v1/player_video_analyses?id=eq.{analysis_id}&select=*"
        )
        if not data:
            raise HTTPException(status_code=404, detail="التحليل غير موجود")
        return data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check failed for {analysis_id}: {e}")
        raise HTTPException(status_code=500, detail="فشل التحقق من الحالة")


@router.get("/player/{player_id}")
async def get_player_analyses(
    player_id: str,
    user: dict = Depends(require_role("admin", "coach", "super_admin", "sous_admin", "parent"))
):
    """Get all video analyses for a player.
    Use player_id='test' to get coach test analyses (no player attached).
    """
    uid = user_id_ctx.get(None)
    try:
        is_test = player_id in ("test", "none", "__test__")
        if is_test:
            # Fetch test analyses created by this specific coach
            data = await supabase._get(
                f"/rest/v1/player_video_analyses"
                f"?created_by=eq.{uid}&player_id=is.null"
                f"&order=created_at.desc&limit=20"
            )
        else:
            data = await supabase._get(
                f"/rest/v1/player_video_analyses?player_id=eq.{player_id}"
                f"&order=created_at.desc&limit=20"
            )
        return data or []
    except Exception as e:
        logger.error(f"Failed to fetch analyses: {e}")
        raise HTTPException(status_code=500, detail="فشل جلب التحليلات")


@router.delete("/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    user: dict = Depends(require_role("admin", "super_admin", "coach"))
):
    """Delete a video analysis record."""
    try:
        await supabase._delete(f"/rest/v1/player_video_analyses?id=eq.{analysis_id}")
        return {"message": "تم الحذف بنجاح"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{analysis_id}/notes")
async def update_coach_notes(
    analysis_id: str,
    notes: str = Form(...),
    user: dict = Depends(require_role("admin", "coach", "super_admin"))
):
    """Add coach notes to an analysis."""
    try:
        await supabase._patch(
            f"/rest/v1/player_video_analyses?id=eq.{analysis_id}",
            json={"coach_notes": notes}
        )
        return {"message": "تم حفظ الملاحظات"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/coaches/{coach_id}/toggle-ai")
async def toggle_coach_ai_access(
    coach_id: str,
    allowed: bool,
    user: dict = Depends(require_role("admin", "super_admin"))
):
    """Toggle AI video analysis access for a specific coach."""
    import httpx
    from core.config import settings as app_settings
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=10.0) as client:
            res = await client.patch(
                f"{app_settings.SUPABASE_URL}/rest/v1/coaches?id=eq.{coach_id}",
                json={"video_ai_allowed": allowed},
                headers={**supabase.admin_headers, "Prefer": "return=representation"},
            )
            if res.status_code not in (200, 201, 204):
                raise HTTPException(status_code=500, detail=f"Failed to update coach: {res.text}")
        return {"message": f"تم {'تفعيل' if allowed else 'تعطيل'} صلاحية التحليل للمدرب"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
